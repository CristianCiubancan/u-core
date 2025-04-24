/**
 * Resource manager
 */
import * as path from 'path';
import * as http from 'http';
import { FileSystem, Logger, ResourceManager } from '../types.js';
import { FileSystemImpl } from '../../utils/fs/FileSystemImpl.js';

/**
 * Resource manager implementation
 */
export class ResourceManagerImpl implements ResourceManager {
  private fs: FileSystem;
  private logger: Logger;
  private reloaderEnabled: boolean;
  private reloaderHost: string;
  private reloaderPort: number;
  private reloaderApiKey: string;

  /**
   * Create a new resource manager
   * @param fs File system
   * @param logger Logger
   * @param options Resource manager options
   */
  constructor(
    fs: FileSystem = new FileSystemImpl(),
    logger: Logger,
    options: {
      reloaderEnabled: boolean;
      reloaderHost: string;
      reloaderPort: number;
      reloaderApiKey: string;
    }
  ) {
    this.fs = fs;
    this.logger = logger;
    this.reloaderEnabled = options.reloaderEnabled;
    this.reloaderHost = options.reloaderHost;
    this.reloaderPort = options.reloaderPort;
    this.reloaderApiKey = options.reloaderApiKey;
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
      const fs = await import('fs/promises');
      await fs.cp(distDir, destinationDir, { recursive: true });

      this.logger.info('Built resources deployed successfully.');
    } catch (error) {
      this.logger.error('Error deploying resources:', error);
      throw error;
    }
  }

  /**
   * Reload a resource
   * @param resourceName Resource name
   */
  async reloadResource(resourceName: string): Promise<void> {
    if (!this.reloaderEnabled) {
      this.logger.debug(
        `Resource reloader is disabled. Skipping reload of ${resourceName}.`
      );
      return;
    }

    this.logger.debug(`Reloading resource: ${resourceName}`);

    try {
      // Construct the URL for the reload request
      const url = `http://${this.reloaderHost}:${this.reloaderPort}/reload/${resourceName}`;

      // Send the request
      await this.sendReloadRequest(url);

      this.logger.info(`Resource ${resourceName} reloaded successfully.`);
    } catch (error) {
      this.logger.error(`Error reloading resource ${resourceName}:`, error);
      throw error;
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

      req.end();
    });
  }
}
