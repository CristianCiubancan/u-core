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

// Function to restart a specific resource. Returns once `StartResource` has
// either succeeded or thrown — never before. The 500ms settle window
// between Stop and Start is wrapped in a Promise so the HTTP handler can
// `await` the full lifecycle and surface the actual start outcome.
async function restartResource(resourceName: string): Promise<boolean> {
  console.log(
    `[resource-manager] Attempting to restart resource: ${resourceName}`
  );

  // Skip if resource name is empty or undefined
  if (!resourceName) {
    console.error(`[resource-manager] Invalid resource name: ${resourceName}`);
    return false;
  }

  // Handle resource names with folder paths (also covers special-case 'core'
  // — the previous code special-cased it but the logic was identical).
  const cleanResourceName = resourceName.includes('/')
    ? resourceName.split('/').pop()
    : resourceName;

  // Skip if resource name is empty after cleaning
  if (!cleanResourceName) {
    console.error(
      `[resource-manager] Invalid resource name after cleaning: ${resourceName}`
    );
    return false;
  }

  // Check if resource exists by attempting to get its state
  const state = GetResourceState(cleanResourceName);
  if (state === 'missing') {
    console.error(
      `[resource-manager] Resource '${cleanResourceName}' not found (state: missing)`
    );
    return false;
  }

  try {
    console.log(`[resource-manager] Stopping resource: ${cleanResourceName}`);
    StopResource(cleanResourceName);
  } catch (error) {
    console.error(
      `[resource-manager] Failed to stop resource ${cleanResourceName}:`,
      error
    );
    return false;
  }

  // Settle window between Stop and Start, wrapped in a Promise that the
  // handler awaits before responding. Previously this was a fire-and-
  // forget `setTimeout(..., 500)`, so the HTTP response went out before
  // StartResource ran and the watcher always saw "OK" even on a failure.
  // Now `restartResource` only resolves after the Start outcome is known.
  const startSucceeded = await new Promise<boolean>((resolve) => setTimeout(() => { try { console.log(`[resource-manager] Starting resource: ${cleanResourceName}`); StartResource(cleanResourceName); resolve(true); } catch (startError) { console.error(`[resource-manager] Failed to start resource ${cleanResourceName}:`, startError); resolve(false); } }, 500));

  if (startSucceeded) {
    console.log(
      `[resource-manager] Successfully restarted resource: ${cleanResourceName}`
    );
  }
  return startSucceeded;
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

    results[resource] = await restartResource(resource);
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
          const success = await restartResource(resourceName);

          res.statusCode = success ? 200 : 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              success,
              resource: resourceName,
              message: success
                ? `Resource '${resourceName}' restarted successfully`
                : `Resource '${resourceName}' failed to start (or was missing)`,
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

// Start the server on port 3414, bound to localhost only. The Docker compose
// publish maps `127.0.0.1:3414:3414`, so cross-host reach requires SSH
// tunneling (or an explicit deployment-time change to both layers).
const PORT = GetConvarInt('resource_manager_port', 3414);

server.listen(PORT, '127.0.0.1', () => {
  console.log(
    `[resource-manager] Resource management server running on 127.0.0.1:${PORT}`
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

    void restartResource(resourceName).then((success) => {
      console.log(
        success
          ? `Resource '${resourceName}' restarted successfully`
          : `Resource '${resourceName}' not found or failed to restart`
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
