/**
 * Configuration utility functions for working with configuration files
 */
import * as path from 'path';
import { fileSystem } from './index.js';
import { getProjectPaths } from './PathUtils.js';

/**
 * Load environment variables from .env file
 * @param envPath Path to the .env file
 * @returns Object containing environment variables
 */
export async function loadEnvFile(envPath: string): Promise<Record<string, string>> {
  const env: Record<string, string> = {};
  
  try {
    if (await fileSystem.exists(envPath)) {
      const content = await fileSystem.readFile(envPath, 'utf8');
      const lines = content.split('\n');
      
      for (const line of lines) {
        // Skip comments and empty lines
        if (line.trim().startsWith('#') || !line.trim()) {
          continue;
        }
        
        // Parse KEY=VALUE format
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          let value = match[2] || '';
          
          // Remove quotes if present
          if (value.startsWith('"') && value.endsWith('"')) {
            value = value.substring(1, value.length - 1);
          } else if (value.startsWith("'") && value.endsWith("'")) {
            value = value.substring(1, value.length - 1);
          }
          
          env[key] = value;
        }
      }
    }
  } catch (error) {
    console.error(`Error loading .env file from ${envPath}:`, error);
  }
  
  return env;
}

/**
 * Get configuration from environment variables
 * @returns Configuration object
 */
export function getConfig(): Record<string, any> {
  return {
    // Default configuration values
    debounceTime: process.env.DEBOUNCE_TIME ? parseInt(process.env.DEBOUNCE_TIME) : 1000,
    distDir: process.env.DIST_DIR || path.join(getProjectPaths().rootDir, 'dist'),
    pluginsDir: process.env.PLUGINS_DIR || getProjectPaths().pluginsDir,
    coreDir: process.env.CORE_DIR || getProjectPaths().coreDir,
    webviewDir: process.env.WEBVIEW_DIR || getProjectPaths().webviewDir,
    // Add more configuration values as needed
  };
}

/**
 * Generate a manifest file for a resource
 * @param resourceName Name of the resource
 * @param files Object containing categorized files
 * @param outputPath Path to write the manifest file
 */
export async function generateManifest(
  resourceName: string,
  files: {
    client: string[];
    server: string[];
    shared: string[];
    translations?: string[];
    [key: string]: string[] | undefined;
  },
  outputPath: string
): Promise<void> {
  // Start with the basic manifest content
  let manifestContent = `fx_version 'cerulean'
game 'gta5'

name '${resourceName}'
description '${resourceName} resource'
author 'Generated'
version '1.0.0'

`;

  // Add files by category
  if (files.client && files.client.length > 0) {
    manifestContent += 'client_scripts {\n';
    files.client.forEach((file) => {
      manifestContent += `  '${file}',\n`;
    });
    manifestContent += '}\n\n';
  }

  if (files.server && files.server.length > 0) {
    manifestContent += 'server_scripts {\n';
    files.server.forEach((file) => {
      manifestContent += `  '${file}',\n`;
    });
    manifestContent += '}\n\n';
  }

  if (files.shared && files.shared.length > 0) {
    manifestContent += 'shared_scripts {\n';
    files.shared.forEach((file) => {
      manifestContent += `  '${file}',\n`;
    });
    manifestContent += '}\n\n';
  }

  // Add translations if available
  if (files.translations && files.translations.length > 0) {
    manifestContent += 'files {\n';
    files.translations.forEach((file) => {
      manifestContent += `  '${file}',\n`;
    });
    manifestContent += '}\n\n';
  }

  // Add ui_page if html/index.html exists
  const htmlPath = path.join(path.dirname(outputPath), 'html', 'index.html');
  if (await fileSystem.exists(htmlPath)) {
    manifestContent += "ui_page 'html/index.html'\n\n";
    
    // Add html files to the files section if not already added
    if (!files.translations || !files.translations.some(f => f.startsWith('html/'))) {
      manifestContent += 'files {\n';
      manifestContent += "  'html/index.html',\n";
      manifestContent += "  'html/**/*',\n";
      manifestContent += '}\n\n';
    }
  }

  // Write the manifest file
  await fileSystem.writeFile(outputPath, manifestContent);
  console.log(`Generated manifest file at: ${outputPath}`);
}

/**
 * Parse a manifest file
 * @param manifestPath Path to the manifest file
 * @returns Parsed manifest data
 */
export async function parseManifest(manifestPath: string): Promise<Record<string, any>> {
  const result: Record<string, any> = {
    client_scripts: [],
    server_scripts: [],
    shared_scripts: [],
    files: [],
  };
  
  try {
    if (await fileSystem.exists(manifestPath)) {
      const content = await fileSystem.readFile(manifestPath, 'utf8');
      const lines = content.split('\n');
      
      let currentSection: string | null = null;
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Skip comments and empty lines
        if (trimmedLine.startsWith('--') || !trimmedLine) {
          continue;
        }
        
        // Check for section start
        if (trimmedLine.endsWith('{')) {
          currentSection = trimmedLine.replace('{', '').trim();
          continue;
        }
        
        // Check for section end
        if (trimmedLine === '}') {
          currentSection = null;
          continue;
        }
        
        // Handle key-value pairs
        if (currentSection === null) {
          const match = trimmedLine.match(/^([a-zA-Z_]+)\s+['"](.+)['"]$/);
          if (match) {
            const key = match[1];
            const value = match[2];
            result[key] = value;
          }
        } else {
          // Handle array items
          if (trimmedLine.includes("'") || trimmedLine.includes('"')) {
            // Extract the value between quotes
            const match = trimmedLine.match(/['"](.+?)['"]/);
            if (match && match[1]) {
              if (!result[currentSection]) {
                result[currentSection] = [];
              }
              result[currentSection].push(match[1]);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error(`Error parsing manifest file from ${manifestPath}:`, error);
  }
  
  return result;
}
