/// <reference types="@citizenfx/server" />
import 'dotenv/config';
import * as http from 'http';
import * as url from 'url';
import * as fs from 'fs';
import * as path from 'path';

// Simple authentication - you should use a more secure method in production
const API_KEY = process.env.RELOADER_API_KEY || 'your-secure-api-key';
console.log(
  `[resource-manager] API_KEY is ${
    API_KEY ? 'configured' : 'using default value'
  }`
);

// File watcher for auto-reload on rebuilds
const WATCH_PATHS = ['dist'];
const WATCH_INTERVAL = 2000; // Check every 2 seconds
const lastModifiedTimes = new Map<string, number>();

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

// Function to restart a specific resource
function restartResource(resourceName: string): boolean {
  console.log(
    `[resource-manager] Attempting to restart resource: ${resourceName}`
  );

  // Skip if resource name is empty or undefined
  if (!resourceName) {
    console.error(`[resource-manager] Invalid resource name: ${resourceName}`);
    return false;
  }

  // Handle special case for core resource
  if (resourceName === 'core' || resourceName.endsWith('/core')) {
    // Extract the clean resource name if it's a path
    const cleanName = resourceName.includes('/')
      ? resourceName.split('/').pop()
      : resourceName;
    console.log(`[resource-manager] Restarting core resource: ${cleanName}`);

    // Check if resource exists
    const state = GetResourceState(cleanName);
    if (state === 'missing') {
      console.error(
        `[resource-manager] Core resource '${cleanName}' not found!`
      );
      return false;
    }

    try {
      console.log(`[resource-manager] Stopping core resource: ${cleanName}`);
      StopResource(cleanName);

      // Add a small delay to ensure the resource is fully stopped
      setTimeout(() => {
        try {
          console.log(
            `[resource-manager] Starting core resource: ${cleanName}`
          );
          StartResource(cleanName);
          console.log(
            `[resource-manager] Successfully restarted core resource: ${cleanName}`
          );
        } catch (startError) {
          console.error(
            `[resource-manager] Failed to start core resource ${cleanName}:`,
            startError
          );
        }
      }, 500);

      return true;
    } catch (error) {
      console.error(
        `[resource-manager] Failed to stop core resource ${cleanName}:`,
        error
      );
      return false;
    }
  }

  // Handle resource names with folder paths
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

    // Add a small delay to ensure the resource is fully stopped
    setTimeout(() => {
      try {
        console.log(
          `[resource-manager] Starting resource: ${cleanResourceName}`
        );
        StartResource(cleanResourceName);
        console.log(
          `[resource-manager] Successfully restarted resource: ${cleanResourceName}`
        );
      } catch (startError) {
        console.error(
          `[resource-manager] Failed to start resource ${cleanResourceName}:`,
          startError
        );
      }
    }, 500);

    return true;
  } catch (error) {
    console.error(
      `[resource-manager] Failed to stop resource ${cleanResourceName}:`,
      error
    );
    return false;
  }
}

// Function to restart all resources
function restartAllResources(): {
  success: boolean;
  results: Record<string, boolean>;
} {
  console.log(`[resource-manager] Restarting all resources...`);
  const resources = getAllResources();
  const results: Record<string, boolean> = {};

  for (const resource of resources) {
    // Skip the current resource to prevent stopping our own HTTP server
    if (resource === GetCurrentResourceName()) {
      results[resource] = true;
      continue;
    }

    results[resource] = restartResource(resource);
  }

  return {
    success: Object.values(results).every((result) => result === true),
    results,
  };
}

// Create HTTP server
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url || '', true);
  const path = parsedUrl.pathname;
  const query = parsedUrl.query;

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle OPTIONS preflight requests
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  // Log incoming requests
  console.log(`[resource-manager] Received ${req.method} request to ${path}`);

  // Authenticate all requests
  const authHeader = req.headers.authorization || '';
  const providedKey = authHeader.replace('Bearer ', '');

  if (providedKey !== API_KEY) {
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
      const success = restartResource(resourceName);

      res.statusCode = success ? 200 : 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          success,
          resource: resourceName,
          message: success
            ? `Resource '${resourceName}' restarted successfully`
            : `Resource '${resourceName}' not found or failed to restart`,
        })
      );
    }
    // Restart all resources
    else {
      console.log(
        `[resource-manager] Processing restart request for all resources`
      );
      const result = restartAllResources();

      res.statusCode = 200;
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
});

// Start the server on port 3414
const PORT = GetConvarInt('resource_manager_port', 3414);

server.listen(PORT, () => {
  console.log(
    `[resource-manager] Resource management server running on port ${PORT}`
  );

  // Initialize file monitoring
  initializeFileWatcher();
});

server.on('error', (err) => {
  console.error('[resource-manager] Server error:', err);
});

// Function to recursively get all files in a directory
function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  if (!fs.existsSync(dirPath)) return arrayOfFiles;

  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

// Initialize file watcher to detect rebuilt resources
function initializeFileWatcher(): void {
  console.log(
    `[auto-reload] Initializing file watcher for resource auto-reload`
  );

  // First pass - record initial file timestamps
  WATCH_PATHS.forEach((watchPath) => {
    try {
      const files = getAllFiles(watchPath);
      files.forEach((file) => {
        const stats = fs.statSync(file);
        lastModifiedTimes.set(file, stats.mtimeMs);
      });
    } catch (error) {
      console.error(`[auto-reload] Error scanning ${watchPath}:`, error);
    }
  });

  // Start watching for changes
  setInterval(() => checkForChanges(), WATCH_INTERVAL);
  console.log(
    `[auto-reload] File watcher started with interval: ${WATCH_INTERVAL}ms`
  );
}

// Check for file changes
function checkForChanges(): void {
  const changedResources = new Set<string>();

  WATCH_PATHS.forEach((watchPath) => {
    try {
      const files = getAllFiles(watchPath);

      // Check for new or modified files
      files.forEach((file) => {
        try {
          const stats = fs.statSync(file);
          const lastModified = lastModifiedTimes.get(file) || 0;

          if (stats.mtimeMs > lastModified) {
            // File was modified
            lastModifiedTimes.set(file, stats.mtimeMs);

            // Determine resource name from path
            const relativePath = path.relative(watchPath, file);
            const resourceDir = relativePath.split(path.sep)[0];

            if (resourceDir && resourceDir !== 'scripts') {
              changedResources.add(resourceDir);
              console.log(
                `[auto-reload] Detected change in resource: ${resourceDir}`
              );
            }
          }
        } catch (error) {
          console.error(`[auto-reload] Error checking file ${file}:`, error);
          // File might have been deleted or is inaccessible
        }
      });

      // Handle deleted files (they won't be in the new list)
      for (const [existingFile] of lastModifiedTimes) {
        if (
          !files.includes(existingFile) &&
          fs.existsSync(path.dirname(existingFile))
        ) {
          // File was deleted
          const relativePath = path.relative(watchPath, existingFile);
          const resourceDir = relativePath.split(path.sep)[0];

          if (resourceDir && resourceDir !== 'scripts') {
            changedResources.add(resourceDir);
            console.log(
              `[auto-reload] Detected deleted file in resource: ${resourceDir}`
            );
          }

          lastModifiedTimes.delete(existingFile);
        }
      }
    } catch (error) {
      console.error(
        `[auto-reload] Error checking ${watchPath} for changes:`,
        error
      );
    }
  });

  // Restart changed resources
  if (changedResources.size > 0) {
    console.log(
      `[auto-reload] Restarting ${changedResources.size} changed resources...`
    );

    for (const resource of changedResources) {
      if (resource === GetCurrentResourceName()) continue;

      const success = restartResource(resource);
      console.log(
        `[auto-reload] Resource '${resource}' restart ${
          success ? 'successful' : 'failed'
        }`
      );
    }
  }
}

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

    const success = restartResource(resourceName);
    console.log(
      success
        ? `Resource '${resourceName}' restarted successfully`
        : `Resource '${resourceName}' not found or failed to restart`
    );
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

    const result = restartAllResources();
    console.log(
      result.success
        ? 'All resources restarted successfully'
        : 'Some resources failed to restart'
    );

    // Log details of any failed restarts
    Object.entries(result.results)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .filter(([_, success]) => !success)
      .forEach(([resource]) => {
        console.log(`Failed to restart resource: ${resource}`);
      });
  },
  true
);
