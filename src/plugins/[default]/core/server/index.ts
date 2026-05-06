/// <reference types="@citizenfx/server" />
import * as http from 'http';
import * as url from 'url';
import * as crypto from 'crypto';

// Read the API key, preferring the FXServer convar (set via
// `setr reloader_api_key "<value>"` in server.cfg) and falling back to the
// RELOADER_API_KEY environment variable. The env path is what the docker
// compose stack uses (env_file: .env) so the secret never has to land in
// a wizard-managed cfg file or be substituted by the txAdmin recipe runner.
//
// Refuse to start without an explicitly-configured key. The previous fallback
// to a literal `***SCRUBBED***` placeholder meant any operator who skipped
// config exposed an unauthenticated remote-resource-control endpoint.
const PLACEHOLDER_API_KEYS = new Set(['<replace-me>', '***SCRUBBED***']);
const CONVAR_API_KEY = GetConvar('reloader_api_key', '');
const ENV_API_KEY = process.env.RELOADER_API_KEY ?? '';
const RAW_API_KEY = CONVAR_API_KEY || ENV_API_KEY;
if (!RAW_API_KEY || PLACEHOLDER_API_KEYS.has(RAW_API_KEY)) {
  const reason = !RAW_API_KEY
    ? 'unset or empty'
    : `equal to placeholder "${RAW_API_KEY}"`;
  console.error(
    `[resource-manager] reloader_api_key is ${reason}. Refusing to start. ` +
      `Set RELOADER_API_KEY in the environment (.env for docker) or add ` +
      `\`setr reloader_api_key "<value>"\` to server.cfg, with a CSPRNG- ` +
      `generated value (e.g. ` +
      `\`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"\`).`
  );
  throw new Error('reloader_api_key is unset or set to placeholder');
}
const API_KEY = RAW_API_KEY;
const API_KEY_BUFFER = Buffer.from(API_KEY, 'utf8');
console.log('[resource-manager] API_KEY is configured');

function constantTimeKeyEqual(provided: string): boolean {
  const providedBuffer = Buffer.from(provided, 'utf8');
  if (providedBuffer.length !== API_KEY_BUFFER.length) {
    return false;
  }
  return crypto.timingSafeEqual(providedBuffer, API_KEY_BUFFER);
}

// Function to get all resource names
function getAllResources(): string[] {
  const resources: string[] = [];
  const numResources = GetNumResources();

  for (let i = 0; i < numResources; i++) {
    const resourceName = GetResourceByFindIndex(i);
    if (resourceName) {
      resources.push(resourceName);
    }
  }

  return resources;
}

// Per-resource async mutex. Concurrent /stop, /start, /restart calls for
// the same resource serialize through this map; cross-resource ops still
// run in parallel. Without this lock, two near-simultaneous /restart
// requests for the same resource interleave their StopResource/Start-
// Resource calls inside FXServer's tick loop, producing the "Starting /
// Starting" double-pump pattern that leaves a partially-loaded script
// env (`Failed to load script player.lua` etc).
const resourceLocks = new Map<string, Promise<unknown>>();

function withResourceLock<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const prev = resourceLocks.get(name) ?? Promise.resolve();
  // Run regardless of `prev`'s outcome — a failed previous lifecycle
  // shouldn't block subsequent ops on the same resource.
  const next = prev.then(fn, fn);
  resourceLocks.set(name, next);
  // Drop the entry once we settle, but only if no later op has already
  // chained onto us (preserving the chain for a third caller queued
  // behind the second).
  void next.catch((): void => undefined).finally((): void => {
    if (resourceLocks.get(name) === next) {
      resourceLocks.delete(name);
    }
  });
  return next as Promise<T>;
}

const STATE_POLL_INTERVAL_MS = 50;
const STOP_TIMEOUT_MS = 5000;
const START_TIMEOUT_MS = 10000;

/**
 * Poll `GetResourceState` until it equals one of `targets` or the
 * timeout elapses. Returns the observed state on match, or null on
 * timeout.
 *
 * FiveM resource state transitions: 'starting' → 'started' on a
 * successful start, 'stopping' → 'stopped' on a stop. A *failed* start
 * (script env never finishes loading) lands in 'stopped' too, so the
 * caller passes both potential terminal states to surface the failure.
 */
async function waitForResourceState(
  name: string,
  targets: readonly string[],
  timeoutMs: number
): Promise<string | null> {
  const deadline = Date.now() + timeoutMs;
  const targetSet = new Set(targets);
  // Fast path: already in the target state.
  const initial = GetResourceState(name);
  if (targetSet.has(initial)) return initial;

  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, STATE_POLL_INTERVAL_MS));
    const state = GetResourceState(name);
    if (targetSet.has(state)) return state;
  }
  return null;
}

interface LifecycleResult {
  success: boolean;
  state?: string;
  message: string;
}

/**
 * Normalize an inbound resource name. We accept both bare names
 * (`qb-core`) and slash-prefixed paths (`[default]/qb-core`) — only the
 * basename is meaningful to FiveM's resource manager.
 */
function cleanResourceName(resourceName: string): string | null {
  if (!resourceName) return null;
  const cleaned = resourceName.includes('/')
    ? resourceName.split('/').pop() ?? null
    : resourceName;
  return cleaned ? cleaned : null;
}

/**
 * Stop a resource and wait for it to reach 'stopped'. Run inside the
 * per-resource lock so concurrent ops can't interleave.
 */
async function performStop(name: string): Promise<LifecycleResult> {
  const initial = GetResourceState(name);
  if (initial === 'missing') {
    return {
      success: false,
      state: 'missing',
      message: `Resource '${name}' not found (state: missing)`,
    };
  }
  if (initial === 'stopped') {
    return {
      success: true,
      state: 'stopped',
      message: `Resource '${name}' was already stopped`,
    };
  }

  console.log(`[resource-manager] Stopping resource: ${name}`);
  try {
    StopResource(name);
  } catch (error) {
    return {
      success: false,
      state: GetResourceState(name),
      message: `StopResource threw: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }

  const final = await waitForResourceState(name, ['stopped'], STOP_TIMEOUT_MS);
  if (final === null) {
    return {
      success: false,
      state: GetResourceState(name),
      message: `Resource '${name}' did not reach 'stopped' within ${STOP_TIMEOUT_MS}ms`,
    };
  }
  return {
    success: true,
    state: final,
    message: `Resource '${name}' stopped`,
  };
}

/**
 * Start a resource and wait for it to reach 'started'. A failed start
 * lands in 'stopped' (transient 'starting' state resolves either way),
 * so we wait for either terminal outcome and surface a failure if the
 * resource didn't end up 'started'.
 */
async function performStart(name: string): Promise<LifecycleResult> {
  const initial = GetResourceState(name);
  if (initial === 'missing') {
    return {
      success: false,
      state: 'missing',
      message: `Resource '${name}' not found (state: missing)`,
    };
  }
  if (initial === 'started') {
    return {
      success: true,
      state: 'started',
      message: `Resource '${name}' was already started`,
    };
  }

  console.log(`[resource-manager] Starting resource: ${name}`);
  try {
    StartResource(name);
  } catch (error) {
    return {
      success: false,
      state: GetResourceState(name),
      message: `StartResource threw: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }

  const final = await waitForResourceState(
    name,
    ['started', 'stopped'],
    START_TIMEOUT_MS
  );
  if (final === null) {
    return {
      success: false,
      state: GetResourceState(name),
      message: `Resource '${name}' did not reach a terminal state within ${START_TIMEOUT_MS}ms`,
    };
  }
  if (final !== 'started') {
    return {
      success: false,
      state: final,
      message: `StartResource left '${name}' in state '${final}' (script env failed to populate)`,
    };
  }
  return {
    success: true,
    state: final,
    message: `Resource '${name}' started`,
  };
}

async function stopResourceAndWait(rawName: string): Promise<LifecycleResult> {
  const name = cleanResourceName(rawName);
  if (!name) {
    return {
      success: false,
      message: `Invalid resource name: ${rawName}`,
    };
  }
  return withResourceLock(name, () => performStop(name));
}

async function startResourceAndWait(
  rawName: string
): Promise<LifecycleResult> {
  const name = cleanResourceName(rawName);
  if (!name) {
    return {
      success: false,
      message: `Invalid resource name: ${rawName}`,
    };
  }
  return withResourceLock(name, () => performStart(name));
}

async function restartResource(rawName: string): Promise<LifecycleResult> {
  const name = cleanResourceName(rawName);
  if (!name) {
    return {
      success: false,
      message: `Invalid resource name: ${rawName}`,
    };
  }
  console.log(`[resource-manager] Attempting to restart resource: ${name}`);
  // Stop+start under a single lock acquisition so a second /restart for
  // the same resource cannot slip between our stop and our start.
  return withResourceLock(name, async () => {
    const stopResult = await performStop(name);
    if (!stopResult.success) {
      return stopResult;
    }
    const startResult = await performStart(name);
    if (startResult.success) {
      console.log(
        `[resource-manager] Successfully restarted resource: ${name}`
      );
    }
    return startResult;
  });
}

// Function to restart all resources
async function restartAllResources(): Promise<{
  success: boolean;
  results: Record<string, boolean>;
}> {
  console.log(`[resource-manager] Restarting all resources...`);
  const resources = getAllResources();
  const results: Record<string, boolean> = {};

  for (const resource of resources) {
    // Skip the current resource to prevent stopping our own HTTP server
    if (resource === GetCurrentResourceName()) {
      results[resource] = true;
      continue;
    }

    const result = await restartResource(resource);
    results[resource] = result.success;
    if (!result.success) {
      console.error(
        `[resource-manager] Restart failed for ${resource}: ${result.message}`
      );
    }
  }

  return {
    success: Object.values(results).every((result) => result === true),
    results,
  };
}

// Create HTTP server. Bound to localhost only; the reload endpoint is a
// developer feature, not a public API, so no CORS headers are emitted.
//
// The handler is async so it can `await` the resource lifecycle and
// surface real success/failure to the watcher. Any unhandled rejection
// inside it would otherwise crash the resource — the outer try/catch
// converts those into a 500 response so the watcher learns about it.
const server = http.createServer((req, res) => {
  void (async () => {
    try {
      const parsedUrl = url.parse(req.url || '', true);
      const path = parsedUrl.pathname;
      const query = parsedUrl.query;

      // Log incoming requests
      console.log(
        `[resource-manager] Received ${req.method} request to ${path}`
      );

      // Authenticate all requests
      const authHeader = req.headers.authorization || '';
      const providedKey = authHeader.replace('Bearer ', '');

      if (!constantTimeKeyEqual(providedKey)) {
        console.error(
          `[resource-manager] Authentication failed - invalid API key provided`
        );
        res.statusCode = 401;
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            success: false,
            error: 'Unauthorized: Invalid API key',
          })
        );
        return;
      }

      // Route handling
      if (path === '/') {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/plain');
        res.end('Resource Management API\n');
      } else if (path === '/resources') {
        const resources = getAllResources();
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            success: true,
            resources,
            count: resources.length,
          })
        );
      } else if (path === '/restart' && req.method === 'POST') {
        // Restart a specific resource
        if (query.resource) {
          const resourceName = query.resource as string;
          console.log(
            `[resource-manager] Processing restart request for resource: ${resourceName}`
          );
          const result = await restartResource(resourceName);

          res.statusCode = result.success ? 200 : 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              success: result.success,
              resource: resourceName,
              message: result.message,
              state: result.state,
            })
          );
        }
        // Restart all resources
        else {
          console.log(
            `[resource-manager] Processing restart request for all resources`
          );
          const result = await restartAllResources();

          res.statusCode = result.success ? 200 : 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              success: result.success,
              message: 'Resources restart operation completed',
              results: result.results,
            })
          );
        }
      } else if (path === '/stop' && req.method === 'POST') {
        // Stop a single resource and wait for it to reach 'stopped'.
        // Used by BuildManager's stop→swap→start lifecycle so the dist
        // swap happens against a torn-down script env (no Windows file
        // locks, no half-loaded successor env).
        if (!query.resource) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              success: false,
              error: '`resource` query parameter required',
            })
          );
        } else {
          const resourceName = query.resource as string;
          console.log(
            `[resource-manager] Processing stop request for resource: ${resourceName}`
          );
          const result = await stopResourceAndWait(resourceName);
          res.statusCode = result.success ? 200 : 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              success: result.success,
              resource: resourceName,
              message: result.message,
              state: result.state,
            })
          );
        }
      } else if (path === '/start' && req.method === 'POST') {
        // Start a single resource and wait for it to reach 'started'.
        // Counterpart to /stop; together they let the watcher gate the
        // dist swap inside the resource's stopped window.
        if (!query.resource) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              success: false,
              error: '`resource` query parameter required',
            })
          );
        } else {
          const resourceName = query.resource as string;
          console.log(
            `[resource-manager] Processing start request for resource: ${resourceName}`
          );
          const result = await startResourceAndWait(resourceName);
          res.statusCode = result.success ? 200 : 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              success: result.success,
              resource: resourceName,
              message: result.message,
              state: result.state,
            })
          );
        }
      } else {
        console.error(`[resource-manager] Invalid endpoint requested: ${path}`);
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            success: false,
            error: 'Endpoint not found',
          })
        );
      }
    } catch (error) {
      console.error('[resource-manager] Unhandled error in request:', error);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            success: false,
            error:
              error instanceof Error ? error.message : 'Internal server error',
          })
        );
      } else {
        res.end();
      }
    }
  })();
});

// Start the server. Bind to all interfaces inside the container — the
// docker-compose port publish (`127.0.0.1:3414:3414`) is what restricts
// reach to host-loopback only; binding to 127.0.0.1 *inside* the container
// would make Docker's NAT unable to forward, since the host port hits
// the container's eth0, not its loopback. Outside Docker (pnpm
// start:windows) this still binds to 0.0.0.0, which is fine for a
// developer machine guarded by the API_KEY auth.
const PORT = GetConvarInt('resource_manager_port', 3414);
const HOST = '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(
    `[resource-manager] Resource management server running on ${HOST}:${PORT}`
  );
});

server.on('error', (err) => {
  console.error('[resource-manager] Server error:', err);
});

// Register command to restart resources from the server console
RegisterCommand(
  'restartresource',
  (source: number, args: string[]) => {
    if (source !== 0) {
      // Only allow this command from the server console
      return;
    }

    const resourceName = args[0];
    if (!resourceName) {
      console.log('Usage: restartresource [resourceName]');
      return;
    }

    void restartResource(resourceName).then((result) => {
      console.log(
        result.success
          ? `Resource '${resourceName}' restarted successfully`
          : `Resource '${resourceName}' restart failed: ${result.message}`
      );
    });
  },
  true
);

// Register command to restart all resources from the server console
RegisterCommand(
  'restartallresources',
  (source: number) => {
    if (source !== 0) {
      // Only allow this command from the server console
      return;
    }

    void restartAllResources().then((result) => {
      console.log(
        result.success
          ? 'All resources restarted successfully'
          : 'Some resources failed to restart'
      );

      // Log details of any failed restarts
      Object.entries(result.results)
         
        .filter(([_, success]) => !success)
        .forEach(([resource]) => {
          console.log(`Failed to restart resource: ${resource}`);
        });
    });
  },
  true
);
