import * as fs from 'fs';
import * as path from 'path';

/**
 * Normalizes file paths to use forward slashes regardless of OS
 * @param value The path or array of paths to normalize
 */
function normalizePaths(value: any): any {
  if (typeof value === 'string') {
    return value.replace(/\\/g, '/');
  } else if (Array.isArray(value)) {
    return value.map((item) => {
      if (typeof item === 'string') {
        return item.replace(/\\/g, '/');
      }
      return item;
    });
  }
  return value;
}

/**
 * Generates an fxmanifest.lua file from plugin configuration
 * @param pluginJson Parsed plugin.json data or path to plugin.json file
 * @param outputPath Path where the manifest should be written
 */
export function generateManifest(
  pluginJson: any | string,
  outputPath: string
): void {
  try {
    // Handle both direct data and file paths
    let config: any;

    if (typeof pluginJson === 'string') {
      // If a string is provided, assume it's a file path
      try {
        const fileContent = fs.readFileSync(pluginJson, 'utf8');
        config = JSON.parse(fileContent);
      } catch (error) {
        throw new Error(
          `Failed to read or parse plugin.json at ${pluginJson}: ${error}`
        );
      }
    } else {
      // Otherwise use the object directly
      config = pluginJson;
    }

    if (!config) {
      throw new Error('No valid plugin configuration data provided');
    }

    // Normalize paths in script arrays and other fields that might contain file paths
    config = {
      ...config,
      client_scripts: normalizePaths(config.client_scripts),
      server_scripts: normalizePaths(config.server_scripts),
      shared_scripts: normalizePaths(config.shared_scripts),
      files: normalizePaths(config.files),
      ui_page: normalizePaths(config.ui_page),
    };

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

      // Exports
      'exports': (value) => {
        let result = '';
        value.forEach((item: string) => {
          result += `export '${item}'\n`;
        });
        return result.trim();
      },
      'server_exports': (value) => {
        let result = '';
        value.forEach((item: string) => {
          result += `server_export '${item}'\n`;
        });
        return result.trim();
      },

      // UI
      'ui_page': (value) => `ui_page '${value.replace(/\\/g, '/')}'`,

      // Files
      'files': (value) => {
        let result = '';
        value.forEach((file: string) => {
          // Ensure forward slashes
          const normalizedFile = file.replace(/\\/g, '/');
          result += `file '${normalizedFile}'\n`;
        });
        return result.trim();
      },

      // Flags
      'is_map': (value) => (value ? `this_is_a_map 'yes'` : ''),
      'server_only': (value) => (value ? `server_only 'yes'` : ''),
      'lua54': (value) => (value ? `lua54 'yes'` : ''),

      // Other
      'provide': (value) => `provide '${value}'`,
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

    // Handle complex properties that need special formatting

    // Level meta
    if (config.level_meta) {
      if (config.level_meta.before) {
        content += `before_level_meta '${config.level_meta.before}'\n`;
      }
      if (config.level_meta.after) {
        content += `after_level_meta '${config.level_meta.after}'\n`;
      }
      if (config.level_meta.replace) {
        content += `replace_level_meta '${config.level_meta.replace}'\n`;
      }
      content += '\n';
    }

    // Data files
    if (
      config.data_files &&
      Array.isArray(config.data_files) &&
      config.data_files.length > 0
    ) {
      config.data_files.forEach((item: { type: string; path: string }) => {
        // Normalize path
        const normalizedPath = item.path.replace(/\\/g, '/');
        content += `data_file '${item.type}' '${normalizedPath}'\n`;
      });
      content += '\n';
    }

    // Loadscreen
    if (config.loadscreen) {
      if (config.loadscreen.page) {
        // Normalize path
        const normalizedPage = config.loadscreen.page.replace(/\\/g, '/');
        content += `loadscreen '${normalizedPage}'\n`;
      }
      if (config.loadscreen.manual_shutdown) {
        content += `loadscreen_manual_shutdown 'yes'\n`;
      }
      content += '\n';
    }

    // Dependencies
    if (
      config.dependencies &&
      Array.isArray(config.dependencies) &&
      config.dependencies.length > 0
    ) {
      config.dependencies.forEach((dep: any) => {
        if (typeof dep === 'string') {
          content += `dependency '${dep}'\n`;
        } else if (typeof dep === 'object' && dep.resource) {
          content += `dependency '${dep.resource}'${
            dep.server ? ` /server:${dep.server}` : ''
          }\n`;
        }
      });
      content += '\n';
    }

    // Experimental features
    if (config.experimental) {
      if (config.experimental.use_fxv2_oal) {
        content += `use_experimental_fxv2_oal 'yes'\n`;
      }
      if (config.experimental.clr_disable_task_scheduler) {
        content += `clr_disable_task_scheduler 'yes'\n`;
      }
      content += '\n';
    }

    // Convars
    if (config.convars) {
      Object.entries(config.convars).forEach(([key, value]: [string, any]) => {
        content += `convar_category '${value.category || key}' {\n`;
        if (value.variables && Array.isArray(value.variables)) {
          value.variables.forEach((variable: any) => {
            content += `    {\n`;
            content += `        name = '${variable.name}',\n`;
            content += `        type = '${variable.type}',\n`;

            // Format default value based on its type
            if (typeof variable.default === 'string') {
              content += `        default = '${variable.default}'\n`;
            } else if (
              typeof variable.default === 'number' ||
              typeof variable.default === 'boolean'
            ) {
              content += `        default = ${variable.default}\n`;
            } else {
              content += `        default = '${JSON.stringify(
                variable.default
              )}'\n`;
            }

            content += `    },\n`;
          });
        }
        content += `}\n\n`;
      });
    }

    // Custom data
    if (config.custom_data) {
      Object.entries(config.custom_data).forEach(
        ([key, value]: [string, any]) => {
          if (typeof value === 'string') {
            content += `${key} '${value}'\n`;
          } else if (typeof value === 'object') {
            const firstKey = Object.keys(value)[0];
            content += `${key} '${firstKey}' {\n`;

            const subObject = value[firstKey];
            if (typeof subObject === 'object') {
              Object.entries(subObject).forEach(
                ([subKey, subValue]: [string, any]) => {
                  content += `    ${subKey} = ${
                    typeof subValue === 'string' ? `'${subValue}'` : subValue
                  }\n`;
                }
              );
            }

            content += `}\n`;
          }
        }
      );
    }

    // Create parent directory if it doesn't exist
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write the manifest file
    fs.writeFileSync(outputPath, content);
    console.log(`Successfully wrote manifest to ${outputPath}`);
  } catch (error) {
    console.error(`Error writing manifest to ${outputPath}:`, error);
  }
}

/**
 * Prepare updated plugin JSON for manifest generation
 */
export function preparePluginManifestData(
  pluginJsonData: any,
  generatedFiles: any,
  scriptFiles: any
) {
  return {
    ...pluginJsonData,
    // Store the resolved patterns for reference
    _resolvedClientScripts: scriptFiles.client,
    _resolvedServerScripts: scriptFiles.server,
    _resolvedSharedScripts: scriptFiles.shared,
    // Use generated files if available, otherwise use original patterns
    client_scripts:
      generatedFiles.client.length > 0
        ? generatedFiles.client
        : pluginJsonData.client_scripts,
    server_scripts:
      generatedFiles.server.length > 0
        ? generatedFiles.server
        : pluginJsonData.server_scripts,
    shared_scripts:
      generatedFiles.shared.length > 0
        ? generatedFiles.shared
        : pluginJsonData.shared_scripts,
  };
}
