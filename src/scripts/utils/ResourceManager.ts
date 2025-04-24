/**
 * Resource Manager to handle resource-related operations
 */
import * as path from 'path';
import * as fs from 'fs';
import http from 'http';

/**
 * Resource Manager to handle resource-related operations
 */
export class ResourceManager {
  private resourceMap = new Map<string, string>(); // Maps path -> resource name
  private resourceRestartTimestamps = new Map<string, number>();
  private readonly RESTART_COOLDOWN_MS = 2000; // 2 seconds cooldown
  private readonly generatedDir?: string;

  constructor(generatedDir?: string) {
    this.generatedDir = generatedDir;
    if (generatedDir) {
      console.log(
        `ResourceManager initialized with generatedDir: ${generatedDir}`
      );
    }
  }

  /**
   * Get the number of mapped resources
   */
  getResourceCount(): number {
    return this.resourceMap.size;
  }

  /**
   * Determine resource name from a path
   */
  getResourceName(filePath: string): string | null {
    // Common subdirectories that aren't resources
    const commonSubdirs = [
      'client',
      'server',
      'shared',
      'html',
      'translations',
      'assets',
    ];

    if (!this.generatedDir) {
      // If no generatedDir is provided, we need to determine the resource name from the path

      // Start from the directory containing the file
      let currentDir = path.dirname(filePath);
      let dirName = path.basename(currentDir);

      // If the current directory is a common subdirectory, move up one level
      if (commonSubdirs.includes(dirName)) {
        currentDir = path.dirname(currentDir);
        dirName = path.basename(currentDir);
      }

      // Check if the directory has a manifest
      const manifestPath = path.join(currentDir, 'fxmanifest.lua');
      if (fs.existsSync(manifestPath)) {
        // First check if the manifest defines a name
        const manifestName = this.getResourceNameFromManifest(manifestPath);
        if (manifestName) {
          return manifestName;
        }
      }

      // If the directory name is in brackets, try to find a non-bracketed parent directory
      if (dirName.startsWith('[') && dirName.endsWith(']')) {
        // Split the path into parts
        const pathParts = currentDir.split(path.sep);

        // Start from the end and work backwards to find a non-bracketed directory
        for (let i = pathParts.length - 2; i >= 0; i--) {
          if (
            !pathParts[i].startsWith('[') &&
            !pathParts[i].endsWith(']') &&
            !commonSubdirs.includes(pathParts[i])
          ) {
            return pathParts[i];
          }
        }
      }

      // Return the resource name (directory name)
      return dirName;
    }

    // Start from the directory containing the file
    let currentDir = path.dirname(filePath);

    // Walk up the directory tree looking for a manifest
    while (currentDir && currentDir !== this.generatedDir) {
      const manifestPath = path.join(currentDir, 'fxmanifest.lua');

      // Check if we've already mapped this directory to a resource
      if (this.resourceMap.has(currentDir)) {
        return this.resourceMap.get(currentDir)!;
      }

      // Check if this directory has a manifest
      if (fs.existsSync(manifestPath)) {
        // First check if the manifest defines a name
        const manifestName = this.getResourceNameFromManifest(manifestPath);
        if (manifestName) {
          this.resourceMap.set(currentDir, manifestName);
          return manifestName;
        }

        // If no name in manifest, use the leaf directory name
        const leafDirName = path.basename(currentDir);

        // If the leaf directory is in brackets, try to find a non-bracketed parent
        if (leafDirName.startsWith('[') && leafDirName.endsWith(']')) {
          // Split the path into parts
          const pathParts = currentDir.split(path.sep);

          // Start from the end and work backwards to find a non-bracketed directory
          for (let i = pathParts.length - 2; i >= 0; i--) {
            if (
              !pathParts[i].startsWith('[') &&
              !pathParts[i].endsWith(']') &&
              !commonSubdirs.includes(pathParts[i])
            ) {
              const resourceName = pathParts[i];
              this.resourceMap.set(currentDir, resourceName);
              return resourceName;
            }
          }
        }

        this.resourceMap.set(currentDir, leafDirName);
        return leafDirName;
      }

      // Move up one directory
      currentDir = path.dirname(currentDir);
    }

    // Fallback: if we couldn't find a manifest, use first directory in relative path
    const relativePath = path.relative(this.generatedDir || '', filePath);
    const pathParts = relativePath.split(path.sep);

    // If the first part is in brackets, try to find a non-bracketed part
    if (
      pathParts.length > 0 &&
      pathParts[0].startsWith('[') &&
      pathParts[0].endsWith(']')
    ) {
      // Look for the first non-bracketed, non-common subdirectory
      for (let i = 1; i < pathParts.length; i++) {
        if (
          !pathParts[i].startsWith('[') &&
          !pathParts[i].endsWith(']') &&
          !commonSubdirs.includes(pathParts[i])
        ) {
          return pathParts[i];
        }
      }
    }

    // Skip common subdirectories that aren't resources
    if (pathParts.length > 1 && commonSubdirs.includes(pathParts[1])) {
      return pathParts[0];
    }

    return pathParts[0] || null;
  }

  /**
   * Extract resource name from manifest file
   */
  getResourceNameFromManifest(manifestPath: string): string | null {
    try {
      if (fs.existsSync(manifestPath)) {
        const content = fs.readFileSync(manifestPath, 'utf8');
        const nameMatch = content.match(/name\s*=\s*["']([^"']+)["']/);
        if (nameMatch && nameMatch[1]) {
          return nameMatch[1];
        }
      }
    } catch (error) {
      console.error('Error reading manifest:', error);
    }
    return null;
  }

  /**
   * Scan directory for resources and build resource map
   */
  scanForResources(dir: string): void {
    try {
      const entries = fs.readdirSync(dir);

      for (const entry of entries) {
        const fullPath = path.join(dir, entry);

        try {
          const stats = fs.statSync(fullPath);

          if (stats.isDirectory()) {
            // Check if this directory has a manifest
            const manifestPath = path.join(fullPath, 'fxmanifest.lua');
            if (fs.existsSync(manifestPath)) {
              // Get resource name from manifest or use directory name
              const manifestName =
                this.getResourceNameFromManifest(manifestPath);
              const resourceName = manifestName || entry;

              this.resourceMap.set(fullPath, resourceName);
              console.log(
                `Mapped directory ${fullPath} to resource ${resourceName}`
              );
            }

            // Recursively scan subdirectories
            this.scanForResources(fullPath);
          }
        } catch (error) {
          // Skip if can't access
        }
      }
    } catch (error) {
      console.error('Error scanning directory:', error);
    }
  }

  /**
   * Restart a resource with cooldown protection
   */
  async restartResource(resourceName: string): Promise<void> {
    // Skip common subdirectories that aren't resources
    const commonSubdirs = [
      'client',
      'server',
      'shared',
      'html',
      'translations',
      'assets',
    ];

    if (commonSubdirs.includes(resourceName)) {
      console.log(
        `Skipping restart for '${resourceName}' as it appears to be a subdirectory, not a resource`
      );
      return;
    }

    // Skip if resource name is in brackets (these are directory containers, not actual resources)
    if (resourceName.startsWith('[') && resourceName.endsWith(']')) {
      console.log(
        `Skipping restart for '${resourceName}' as it appears to be a directory container, not a resource`
      );
      return;
    }

    console.log(`Restarting resource: ${resourceName}`);

    // Skip if resource name is empty or undefined
    if (!resourceName) {
      console.error(`Invalid resource name: ${resourceName}`);
      return;
    }

    // Check if this resource was recently restarted
    const lastRestartTime =
      this.resourceRestartTimestamps.get(resourceName) || 0;
    const now = Date.now();
    const timeSinceLastRestart = now - lastRestartTime;

    if (timeSinceLastRestart < this.RESTART_COOLDOWN_MS) {
      console.log(
        `Skipping restart for ${resourceName} - last restart was ${timeSinceLastRestart}ms ago (cooldown: ${this.RESTART_COOLDOWN_MS}ms)`
      );
      return;
    }

    // Update the timestamp for this resource
    this.resourceRestartTimestamps.set(resourceName, now);

    await this.notifyResourceManager(resourceName);
  }

  /**
   * Notify resource manager to restart a resource
   */
  private notifyResourceManager(resourceName: string): Promise<void> {
    return new Promise((resolve) => {
      // Check if reloader is enabled
      if (process.env.RELOADER_ENABLED !== 'true') {
        console.log(
          `Resource reloader is disabled. Skipping restart for ${resourceName}`
        );
        resolve();
        return;
      }

      // Properly encode resource name
      const encodedResourceName = encodeURIComponent(resourceName);

      const options = {
        hostname: process.env.RELOADER_HOST || 'localhost',
        port: parseInt(process.env.RELOADER_PORT || '3414', 10),
        path: `/restart?resource=${encodedResourceName}`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${
            process.env.RELOADER_API_KEY || 'your-secure-api-key'
          }`,
        },
      };

      console.log(`Sending restart request for resource: ${resourceName}`);

      const req = http.request(options, (res: any) => {
        let data = '';

        res.on('data', (chunk: any) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            console.log(
              `Resource reload ${
                response.success ? 'successful' : 'failed'
              } for ${resourceName}`
            );

            if (!response.success) {
              console.log(`Failed response: ${JSON.stringify(response)}`);
            }

            // Add a delay before resolving to prevent rapid-fire restarts
            setTimeout(() => {
              resolve();
            }, 500);
          } catch (error) {
            console.error('Error parsing response:', error);
            console.error('Raw response data:', data);
            resolve(); // Still resolve to prevent chain from breaking
          }
        });
      });

      req.on('error', (error: any) => {
        console.error(`Error notifying resource manager: ${error.message}`);
        // Still resolve to prevent chain from breaking
        setTimeout(() => {
          resolve();
        }, 500);
      });

      // Set a timeout for the request
      req.setTimeout(5000, () => {
        console.error(`Request timeout for resource: ${resourceName}`);
        req.destroy();
        resolve(); // Still resolve to prevent chain from breaking
      });

      req.end();
    });
  }
}
