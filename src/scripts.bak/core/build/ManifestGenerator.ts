/**
 * Manifest generator
 */
import * as path from 'path';
import { FileSystem, Logger, ManifestGenerator } from '../types.js';
import { FileSystemImpl } from '../../utils/fs/FileSystemImpl.js';

/**
 * Manifest generator implementation
 */
export class ManifestGeneratorImpl implements ManifestGenerator {
  private fs: FileSystem;
  private logger: Logger;

  /**
   * Create a new manifest generator
   * @param fs File system
   * @param logger Logger
   */
  constructor(fs: FileSystem = new FileSystemImpl(), logger: Logger) {
    this.fs = fs;
    this.logger = logger;
  }

  /**
   * Generate a manifest
   * @param config Manifest configuration
   * @param outputPath Output path
   */
  async generate(config: any, outputPath: string): Promise<void> {
    this.logger.debug(`Generating manifest for ${config.name || 'unnamed plugin'} at ${outputPath}`);
    
    try {
      // Ensure the output directory exists
      await this.fs.ensureDir(path.dirname(outputPath));
      
      // Generate manifest content
      const content = this.generateManifestContent(config);
      
      // Write the manifest
      await this.fs.writeFile(outputPath, content);
      
      this.logger.debug(`Successfully generated manifest at ${outputPath}`);
    } catch (error) {
      this.logger.error(`Error generating manifest:`, error);
      throw error;
    }
  }

  /**
   * Generate manifest content
   * @param config Manifest configuration
   * @returns Manifest content
   */
  private generateManifestContent(config: any): string {
    // Map of JSON schema properties to fxmanifest.lua format
    const schemaToManifestMap: Record<
      string,
      string | ((value: any) => string)
    > = {
      // Basic metadata
      'fx_version': (value) => `fx_version '${value}'`,
      'games': (value) => `games { '${value.join("', '")}' }`,
      'author': (value) => `author '${value}'`,
      'description': (value) => `description '${value}'`,
      'version': (value) => `version '${value}'`,

      // Scripts
      'client_scripts': (value) => {
        let result = `client_scripts {\n`;
        value.forEach((script: string) => {
          // Ensure forward slashes
          const normalizedScript = script.replace(/\\/g, '/');
          result += `    '${normalizedScript}',\n`;
        });
        result += `}`;
        return result;
      },
      'server_scripts': (value) => {
        let result = `server_scripts {\n`;
        value.forEach((script: string) => {
          // Ensure forward slashes
          const normalizedScript = script.replace(/\\/g, '/');
          result += `    '${normalizedScript}',\n`;
        });
        result += `}`;
        return result;
      },
      'shared_scripts': (value) => {
        let result = `shared_scripts {\n`;
        value.forEach((script: string) => {
          // Ensure forward slashes
          const normalizedScript = script.replace(/\\/g, '/');
          result += `    '${normalizedScript}',\n`;
        });
        result += `}`;
        return result;
      },

      // Files
      'files': (value) => {
        let result = `files {\n`;
        value.forEach((file: string) => {
          // Ensure forward slashes
          const normalizedFile = file.replace(/\\/g, '/');
          result += `    '${normalizedFile}',\n`;
        });
        result += `}`;
        return result;
      },

      // UI page
      'ui_page': (value) => `ui_page '${value}'`,

      // Dependencies
      'dependencies': (value) => {
        let result = `dependencies {\n`;
        value.forEach((dep: string) => {
          result += `    '${dep}',\n`;
        });
        result += `}`;
        return result;
      },

      // Experimental features
      'experimental': (value) => {
        let result = '';
        if (value.use_fxv2_oal) {
          result += `lua54 'yes'\n`;
        }
        if (value.clr_disable_task_scheduler) {
          result += `clr_disable_task_scheduler 'yes'\n`;
        }
        return result;
      },
    };

    // Start building the manifest content
    let content = `-- Generated manifest for ${
      config.name || 'unnamed plugin'
    }\n\n`;

    // Process basic properties using the mapping
    for (const [key, formatter] of Object.entries(schemaToManifestMap)) {
      if (config[key] !== undefined && config[key] !== null) {
        const formattedValue =
          typeof formatter === 'function'
            ? formatter(config[key])
            : formatter.replace('{value}', config[key]);

        if (formattedValue) {
          content += formattedValue + '\n\n';
        }
      }
    }

    return content;
  }

  /**
   * Prepare plugin manifest data
   * @param pluginJsonData Plugin JSON data
   * @param generatedFiles Generated files
   * @param scriptFiles Script files
   * @returns Updated plugin JSON data
   */
  preparePluginManifestData(
    pluginJsonData: any,
    generatedFiles: any,
    scriptFiles: any
  ): any {
    this.logger.debug('Preparing plugin manifest data...');
    
    // Helper function to replace .ts with .js in file paths
    const replaceExtension = (files: string[]): string[] => {
      return files.map((file) => file.replace(/\.ts$/, '.js'));
    };

    // Replace extensions in generated files
    const processedGeneratedFiles = {
      client: replaceExtension(generatedFiles.client || []),
      server: replaceExtension(generatedFiles.server || []),
      shared: replaceExtension(generatedFiles.shared || []),
    };

    // Replace extensions in script files
    const processedScriptFiles = {
      client: replaceExtension(scriptFiles.client || []),
      server: replaceExtension(scriptFiles.server || []),
      shared: replaceExtension(scriptFiles.shared || []),
    };

    // Get original script patterns
    const originalClientScripts = pluginJsonData.client_scripts || [];
    const originalServerScripts = pluginJsonData.server_scripts || [];
    const originalSharedScripts = pluginJsonData.shared_scripts || [];

    // Process files array
    const files = pluginJsonData.files || [];
    const processedFiles = files.map((file: string) => {
      // Replace .ts with .js in file paths
      return file.replace(/\.ts$/, '.js');
    });

    return {
      ...pluginJsonData,
      // Store the resolved patterns for reference with .ts replaced by .js
      _resolvedClientScripts: processedScriptFiles.client,
      _resolvedServerScripts: processedScriptFiles.server,
      _resolvedSharedScripts: processedScriptFiles.shared,
      // Use generated files if available, otherwise use original patterns
      client_scripts:
        processedGeneratedFiles.client.length > 0
          ? processedGeneratedFiles.client
          : originalClientScripts,
      server_scripts:
        processedGeneratedFiles.server.length > 0
          ? processedGeneratedFiles.server
          : originalServerScripts,
      shared_scripts:
        processedGeneratedFiles.shared.length > 0
          ? processedGeneratedFiles.shared
          : originalSharedScripts,
      // Update files array with .ts replaced by .js
      files: processedFiles,
    };
  }
}
