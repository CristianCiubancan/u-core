/**
 * HTML utility functions for generating HTML files for plugins
 */
import * as path from 'path';
import { fileSystem } from './index.js';
import { Plugin } from '../../core/types.js';
import { normalizePath } from './PathUtils.js';

/**
 * Generate HTML files for plugins with html/Page.tsx files
 * @param plugins Array of plugin objects
 * @param distDir The main distribution directory
 */
export async function generatePluginHtmlFiles(
  plugins: Plugin[],
  distDir: string
): Promise<void> {
  console.log('\nGenerating HTML files for plugins with Page.tsx...');

  // Get the webview assets directory
  const webviewAssetsDir = path.join(distDir, 'webview', 'assets');

  try {
    // Verify webview assets directory exists
    if (!(await fileSystem.exists(webviewAssetsDir))) {
      throw new Error(
        `Webview assets directory not found: ${webviewAssetsDir}`
      );
    }

    // Get the asset filenames
    const assetFiles = await fileSystem.readdir(webviewAssetsDir);

    // Find the JS and CSS files
    const indexJsFile = assetFiles.find(
      (file: string) => file.startsWith('index-') && file.endsWith('.js')
    );
    const vendorJsFile = assetFiles.find(
      (file: string) => file.startsWith('vendor-') && file.endsWith('.js')
    );
    const indexCssFile = assetFiles.find(
      (file: string) => file.startsWith('index-') && file.endsWith('.css')
    );

    if (!indexJsFile) {
      throw new Error('Could not find index JS file in webview assets');
    }

    if (!indexCssFile) {
      throw new Error('Could not find index CSS file in webview assets');
    }

    // Find plugins with webview pages
    const webviewPlugins = plugins.filter(
      (plugin) => plugin.hasHtml && plugin.fullPath
    );

    console.log(`Found ${webviewPlugins.length} plugins with webview pages`);

    if (webviewPlugins.length === 0) {
      console.log('No webview plugins found, skipping HTML generation');
      return;
    }

    // Generate HTML files for each plugin
    for (const plugin of webviewPlugins) {
      if (!plugin.fullPath) continue;

      // Get the plugin's output directory
      // Check if the path starts with 'plugins/' and strip it if needed
      const normalizedPluginPath = normalizePath(plugin.pathFromPluginsDir);
      const pluginsPathNormalized = normalizePath('plugins');
      const pathContainsPluginsPrefix =
        normalizedPluginPath.startsWith(pluginsPathNormalized) ||
        normalizedPluginPath.startsWith(pluginsPathNormalized + '/');

      let pluginRelativePath;
      if (pathContainsPluginsPrefix) {
        // Strip the 'plugins/' prefix to place resources directly in dist
        pluginRelativePath = normalizePath(
          path.relative(pluginsPathNormalized, normalizedPluginPath)
        );
        console.log(
          `HTML Generator: Stripped 'plugins/' prefix from path: ${normalizedPluginPath} -> ${pluginRelativePath}`
        );
      } else {
        pluginRelativePath = plugin.pathFromPluginsDir;
      }

      const outputDir = path.join(distDir, pluginRelativePath);
      const htmlDir = path.join(outputDir, 'html');

      // Ensure the html directory exists
      await fileSystem.ensureDir(htmlDir);

      // Read the plugin.json to get the plugin name
      const pluginJsonPath = path.join(plugin.fullPath, 'plugin.json');
      let pluginManifest;
      try {
        const pluginJsonContent = await fileSystem.readFile(
          pluginJsonPath,
          'utf8'
        );
        pluginManifest = JSON.parse(pluginJsonContent);
      } catch (error) {
        console.error(`Error reading plugin.json for ${plugin.name}:`, error);
        pluginManifest = { name: plugin.name || 'UI Resource' };
      }

      // Generate the HTML content
      const title = pluginManifest.name || 'UI Resource';
      const html = generateHtmlContent(
        title,
        indexJsFile,
        vendorJsFile,
        indexCssFile
      );

      // Write the HTML file
      const htmlFilePath = path.join(htmlDir, 'index.html');
      await fileSystem.writeFile(htmlFilePath, html);
      console.log(`Generated ${htmlFilePath}`);
    }

    console.log('HTML generation completed successfully!');
  } catch (error) {
    console.error('Error generating HTML files:', error);
    throw error;
  }
}

/**
 * Generate HTML content for a plugin
 * @param title Title for the HTML page
 * @param indexJsFile Name of the index JS file
 * @param vendorJsFile Name of the vendor JS file (optional)
 * @param indexCssFile Name of the index CSS file
 * @returns HTML content as a string
 */
export function generateHtmlContent(
  title: string,
  indexJsFile: string,
  vendorJsFile?: string,
  indexCssFile?: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap"
      rel="stylesheet"
    />
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <script
      type="module"
      crossorigin
      src="https://cfx-nui-webview/assets/${indexJsFile}"
    ></script>
    ${
      vendorJsFile
        ? `<link
      rel="modulepreload"
      crossorigin
      href="https://cfx-nui-webview/assets/${vendorJsFile}"
    />`
        : ''
    }
    ${
      indexCssFile
        ? `<link
      rel="stylesheet"
      crossorigin
      href="https://cfx-nui-webview/assets/${indexCssFile}"
    />`
        : ''
    }
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;
}

/**
 * Generate a simple HTML file with a script reference
 * @param title Title for the HTML page
 * @param scriptPath Path to the script file
 * @returns HTML content as a string
 */
export function generateSimpleHtmlContent(
  title: string,
  scriptPath: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="${scriptPath}"></script>
  </body>
</html>`;
}
