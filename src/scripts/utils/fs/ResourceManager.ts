/**
 * Unified Resource Manager
 * Combines functionality from both ResourceManager implementations
 */
import * as path from 'path';
import * as fs from 'fs';
import * as http from 'http';
import { FileSystem, Logger } from '../../core/types.js';
import { FileSystemImpl } from './FileSystemImpl.js';
import { ConsoleLogger, LogLevel } from '../logger/ConsoleLogger.js';

/**
 * Options for the resource manager
 */
export interface ResourceManagerOptions {
  reloaderEnabled: boolean;
  reloaderHost: string;
  reloaderPort: number;
  reloaderApiKey: string;
  generatedDir?: string;
}

/**
 * Default options for the resource manager
 */
const DEFAULT_OPTIONS: ResourceManagerOptions = {
  reloaderEnabled: process.env.RELOADER_ENABLED === 'true',
  reloaderHost: process.env.RELOADER_HOST || 'localhost',
  reloaderPort: parseInt(process.env.RELOADER_PORT || '3414', 10),
  reloaderApiKey: process.env.RELOADER_API_KEY || 'your-secure-api-key',
};

/**
 * Unified Resource Manager
 * Handles resource deployment, reloading, and tracking
 */
export class ResourceManager {
  private fs: FileSystem;
  private logger: Logger;
  private resourceMap = new Map<string, string>(); // Maps path -> resource name
  private resourceRestartTimestamps = new Map<string, number>();
  private readonly RESTART_COOLDOWN_MS = 2000; // 2 seconds cooldown
  
  // Options
  private reloaderEnabled: boolean;
  private reloaderHost: string;
  private reloaderPort: number;
  private reloaderApiKey: string;
  private generatedDir?: string;

  /**
   * Create a new resource manager
   * @param fs File system implementation
   * @param logger Logger implementation
   * @param options Resource manager options
   */
  constructor(
    fs: FileSystem = new FileSystemImpl(),
    logger: Logger = new ConsoleLogger({ minLevel: LogLevel.Info }),
    options: Partial<ResourceManagerOptions> = {}
  ) {
    this.fs = fs;
    this.logger = logger;
    
    // Merge default options with provided options
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
    
    this.reloaderEnabled = mergedOptions.reloaderEnabled;
    this.reloaderHost = mergedOptions.reloaderHost;
    this.reloaderPort = mergedOptions.reloaderPort;
    this.reloaderApiKey = mergedOptions.reloaderApiKey;
    this.generatedDir = mergedOptions.generatedDir;
    
    if (this.generatedDir) {
      this.logger.debug(`ResourceManager initialized with generatedDir: ${this.generatedDir}`);
    }
  }

  /**
   * Get the number of mapped resources
   */
  getResourceCount(): number {
    return this.resourceMap.size;
  }

  /**
   * Deploy resources to the server
   * @param distDir Distribution directory
   */
  async deployResources(distDir: string): Promise<void> {
    this.logger.debug(`Deploying resources from ${distDir}`);

    try {
      // Get server name from environment variables
      const serverName = process.env.SERVER_NAME;

      if (!serverName) {
        this.logger.warn(
          'SERVER_NAME environment variable is not set. Skipping resource deployment.'
        );
        return;
      }

      const generatedDirName = `[GENERATED]`;
      const destinationBase = path.join('txData', serverName, 'resources');
      const destinationDir = path.join(destinationBase, generatedDirName);

      // Ensure destination directory exists
      this.logger.debug(
        `Ensuring destination directory exists: ${destinationDir}`
      );
      await this.fs.ensureDir(destinationDir);

      // Copy built resources
      this.logger.debug(
        `Copying built resources from ${distDir} to ${destinationDir}`
      );

      // Use Node.js fs module for recursive copying
      const fsPromises = await import('fs/promises');
      await fsPromises.cp(distDir, destinationDir, { recursive: true });

      this.logger.info('Built resources deployed successfully.');
    } catch (error) {
      this.logger.error('Error deploying resources:', error);
      throw error;
    }
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
      this.logger.error('Error reading manifest:', error);
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
              this.logger.debug(
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
      this.logger.error('Error scanning directory:', error);
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
      this.logger.debug(
        `Skipping restart for '${resourceName}' as it appears to be a subdirectory, not a resource`
      );
      return;
    }

    // Skip if resource name is in brackets (these are directory containers, not actual resources)
    if (resourceName.startsWith('[') && resourceName.endsWith(']')) {
      this.logger.debug(
        `Skipping restart for '${resourceName}' as it appears to be a directory container, not a resource`
      );
      return;
    }

    this.logger.debug(`Restarting resource: ${resourceName}`);

    // Skip if resource name is empty or undefined
    if (!resourceName) {
      this.logger.error(`Invalid resource name: ${resourceName}`);
      return;
    }

    // Check if this resource was recently restarted
    const lastRestartTime =
      this.resourceRestartTimestamps.get(resourceName) || 0;
    const now = Date.now();
    const timeSinceLastRestart = now - lastRestartTime;

    if (timeSinceLastRestart < this.RESTART_COOLDOWN_MS) {
      this.logger.debug(
        `Skipping restart for ${resourceName} - last restart was ${timeSinceLastRestart}ms ago (cooldown: ${this.RESTART_COOLDOWN_MS}ms)`
      );
      return;
    }

    // Update the timestamp for this resource
    this.resourceRestartTimestamps.set(resourceName, now);

    if (!this.reloaderEnabled) {
      this.logger.debug(
        `Resource reloader is disabled. Skipping reload of ${resourceName}.`
      );
      return;
    }

    try {
      // Construct the URL for the reload request
      const url = `http://${this.reloaderHost}:${this.reloaderPort}/reload/${resourceName}`;

      // Send the request
      await this.sendReloadRequest(url);

      this.logger.info(`Resource ${resourceName} reloaded successfully.`);
    } catch (error) {
      this.logger.error(`Error reloading resource ${resourceName}:`, error);
    }
  }

  /**
   * Send a reload request
   * @param url URL to send the request to
   */
  private sendReloadRequest(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const options = {
        headers: {
          'X-API-Key': this.reloaderApiKey,
        },
      };

      const req = http.get(url, options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve();
          } else {
            reject(
              new Error(`Failed to reload resource: ${res.statusCode} ${data}`)
            );
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      // Set a timeout for the request
      req.setTimeout(5000, () => {
        this.logger.error(`Request timeout for resource reload`);
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.end();
    });
  }
}
