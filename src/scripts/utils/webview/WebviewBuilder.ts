/**
 * WebviewBuilder class for building webview UIs
 */
import * as path from 'path';
import { spawn } from 'child_process';
import { Plugin } from '../../core/types.js';
import { fileSystem } from '../fs/index.js';
import { generateSimpleHtmlContent } from '../fs/HtmlUtils.js';
import { Logger } from '../../core/types.js';
import { ConsoleLogger } from '../logger/ConsoleLogger.js';

/**
 * Webview build result
 */
export interface WebviewBuildResult {
  htmlDir: string;
  hasIndexHtml: boolean;
  hasAssets: boolean;
  success: boolean;
}

/**
 * Builder for webview UIs
 */
export class WebviewBuilder {
  private logger: Logger;

  /**
   * Create a new WebviewBuilder
   * @param logger Logger instance
   */
  constructor(logger: Logger = new ConsoleLogger()) {
    this.logger = logger;
  }

  /**
   * Builds the webview UI by generating App.tsx and running the Vite build.
   * @param plugins Array of plugin objects
   * @param distDir The main distribution directory
   * @returns Promise<string> Path to the built webview directory
   */
  async buildWebview(plugins: Plugin[], distDir: string): Promise<string> {
    this.logger.info('\nBuilding webview UI...');

    // Validate inputs
    if (!Array.isArray(plugins)) {
      throw new Error('Plugins must be an array');
    }

    if (!distDir) {
      throw new Error('Distribution directory must be provided');
    }

    // Path to the webview directory
    const webviewDir = path.join(process.cwd(), 'src/webview');
    const webviewDistDir = path.join(distDir, 'webview');

    try {
      // Verify webview source directory exists
      if (!(await fileSystem.exists(webviewDir))) {
        throw new Error(`Webview directory not found: ${webviewDir}`);
      }

      // Make sure the output directory exists (Vite will clean it)
      await fileSystem.ensureDir(webviewDistDir);

      // Resolve the promises in the filter
      const resolvedWebviewPlugins = await Promise.all(
        plugins
          .filter((plugin) => plugin.hasHtml && plugin.fullPath)
          .map(async (plugin) => {
            const pageFile = path.join(plugin.fullPath!, 'html', 'Page.tsx');
            if (await fileSystem.exists(pageFile)) {
              return plugin;
            }
            return null;
          })
      );

      // Filter out null values
      const validWebviewPlugins = resolvedWebviewPlugins.filter(
        Boolean
      ) as Plugin[];

      this.logger.info(
        `Found ${validWebviewPlugins.length} plugins with webview pages`
      );

      if (validWebviewPlugins.length === 0) {
        this.logger.info(
          'No webview plugins found, skipping App.tsx generation'
        );
        return webviewDistDir;
      }

      // Set up directories - src directory is where the App.tsx and other files will be generated
      const srcDir = path.join(webviewDir, 'src');
      await fileSystem.ensureDir(srcDir);

      // Generate App.tsx content
      const appContent = this.generateAppTsxContent(
        validWebviewPlugins,
        srcDir
      );

      // Write generated content to App.tsx
      const appFilePath = path.join(srcDir, 'App.tsx');
      await fileSystem.writeFile(appFilePath, appContent);
      this.logger.info(`Generated ${appFilePath}`);

      // Create main.tsx file
      const mainTsxContent = this.generateMainTsxContent();
      const mainTsxPath = path.join(srcDir, 'main.tsx');
      await fileSystem.writeFile(mainTsxPath, mainTsxContent);
      this.logger.info(`Generated ${mainTsxPath}`);

      // Create or verify index.html
      await this.ensureIndexHtml(srcDir, 'Webview');

      // Create index.css if it doesn't exist
      await this.ensureIndexCss(srcDir);

      // Run Vite build
      await this.runViteBuild();

      this.logger.info('Webview build completed successfully!');
      return webviewDistDir;
    } catch (error) {
      this.logger.error('Webview build failed:', error);
      throw error;
    }
  }

  /**
   * Builds a webview UI for a single plugin by generating App.tsx and running the Vite build.
   * @param plugin The plugin object to build the webview for
   * @param distDir The main distribution directory
   * @returns Promise<WebviewBuildResult> Object containing the html directory path and verification results
   */
  async buildPluginWebview(
    plugin: Plugin,
    distDir: string
  ): Promise<WebviewBuildResult> {
    this.logger.info(
      `\nBuilding webview UI for plugin: ${
        plugin.name || plugin.pathFromPluginsDir || 'unknown'
      }...`
    );

    // Validate inputs
    if (!plugin) {
      throw new Error('Plugin must be provided');
    }

    if (!distDir) {
      throw new Error('Distribution directory must be provided');
    }

    // Path to the webview directory
    const webviewDir = path.join(process.cwd(), 'src/webview');

    // Determine the plugin's resource path in the dist directory
    const {
      resourcePath,
      pluginRelativePath,
      htmlOutputDir,
      webviewPluginDistDir,
    } = this.calculatePluginPaths(plugin, distDir);

    try {
      // Verify webview source directory exists
      if (!(await fileSystem.exists(webviewDir))) {
        throw new Error(`Webview directory not found: ${webviewDir}`);
      }

      // Make sure the output directory exists
      await fileSystem.ensureDir(webviewPluginDistDir);

      // Check if plugin has a webview page
      if (!plugin.hasHtml || !plugin.fullPath) {
        this.logger.info('Plugin does not have webview pages, skipping build');
        return {
          htmlDir: webviewPluginDistDir,
          hasIndexHtml: false,
          hasAssets: false,
          success: false,
        };
      }

      const pageFile = path.join(plugin.fullPath, 'html', 'Page.tsx');

      if (!(await fileSystem.exists(pageFile))) {
        this.logger.info(
          'Plugin does not have a Page.tsx file, skipping build'
        );
        return {
          htmlDir: webviewPluginDistDir,
          hasIndexHtml: false,
          hasAssets: false,
          success: false,
        };
      }

      this.logger.info(`Found webview page for plugin: ${pageFile}`);

      // Set up directories - src directory is where the App.tsx and other files will be generated
      const srcDir = path.join(webviewDir, 'src');
      await fileSystem.ensureDir(srcDir);

      // Generate App.tsx content for this single plugin
      const appContent = this.generateSinglePluginAppTsxContent(
        plugin,
        srcDir,
        pageFile
      );

      // Write generated content to App.tsx
      const appFilePath = path.join(srcDir, 'App.tsx');
      await fileSystem.writeFile(appFilePath, appContent);
      this.logger.info(`Generated ${appFilePath}`);

      // Create main.tsx file
      const mainTsxContent = this.generateMainTsxContent();
      const mainTsxPath = path.join(srcDir, 'main.tsx');
      await fileSystem.writeFile(mainTsxPath, mainTsxContent);
      this.logger.info(`Generated ${mainTsxPath}`);

      // Create or verify index.html
      const pluginTitle = plugin.name || pluginRelativePath || 'Plugin Webview';
      await this.ensureIndexHtml(srcDir, `Plugin Webview - ${pluginTitle}`);

      // Create index.css if it doesn't exist
      await this.ensureIndexCss(srcDir);

      // Run Vite build directly to the plugin's directory
      this.logger.info(
        `Running Vite build for plugin: ${pluginRelativePath}...`
      );
      try {
        // Build directly to the plugin's html directory
        const buildCommand = `npx vite build --outDir=${htmlOutputDir}`;
        this.logger.info(`Executing: ${buildCommand}`);

        // Use spawn to stream logs without buffering large output
        const child = spawn(buildCommand, {
          cwd: process.cwd(),
          shell: true,
          stdio: 'inherit',
          env: {
            ...process.env,
            PLUGIN_WEBVIEW_ID: pluginRelativePath, // Can be used in vite.config.ts to customize the build
          },
        });
        await new Promise<void>((resolve, reject) => {
          child.on('close', (code) =>
            code === 0
              ? resolve()
              : reject(new Error(`Build command failed with exit code ${code}`))
          );
        });

        this.logger.info(`Webview built successfully at: ${htmlOutputDir}`);

        // List files in the output directory
        const filePaths = fileSystem.getFilePaths(htmlOutputDir);

        // Log the contents for verification
        for (const filePath of filePaths) {
          const relativePath = path.relative(htmlOutputDir, filePath);
          this.logger.info(`  [FILE] ${relativePath}`);
        }

        // Verify that the html directory contains the expected files
        const hasIndexHtml = filePaths.some(
          (file) => path.basename(file) === 'index.html'
        );
        const hasAssets = filePaths.some((file) => file.includes('assets/'));

        if (!hasIndexHtml) {
          this.logger.warn(`Warning: No index.html found in ${htmlOutputDir}`);
        }

        if (!hasAssets) {
          this.logger.warn(
            `Warning: No assets directory found in ${htmlOutputDir}`
          );
        }

        this.logger.info(`--- End verification of ${webviewPluginDistDir} ---`);

        // Return an object with the html directory path and verification results
        return {
          htmlDir: htmlOutputDir,
          hasIndexHtml,
          hasAssets,
          success: hasIndexHtml, // Consider the build successful if at least index.html exists
        };
      } catch (error: any) {
        this.logger.error(
          `Vite build for plugin ${pluginRelativePath} failed:`,
          error
        );

        // Add more helpful error information
        let errorMessage = `Vite build for plugin ${pluginRelativePath} failed: ${
          error?.message || error
        }`;

        // Check if index.html exists and has correct format
        const indexHtmlPath = path.join(srcDir, 'index.html');
        if (await fileSystem.exists(indexHtmlPath)) {
          try {
            const indexHtmlContent = await fileSystem.readFile(
              indexHtmlPath,
              'utf8'
            );
            if (
              !indexHtmlContent.includes('./main.tsx') &&
              !indexHtmlContent.includes('main.tsx')
            ) {
              errorMessage +=
                '\nPossible cause: index.html does not reference main.tsx correctly.';
            }
          } catch (err) {
            errorMessage +=
              '\nPossible cause: index.html exists but cannot be read.';
          }
        } else {
          errorMessage += '\nPossible cause: index.html does not exist.';
        }

        // Return failure result
        return {
          htmlDir: htmlOutputDir,
          hasIndexHtml: false,
          hasAssets: false,
          success: false,
        };
      }
    } catch (error) {
      this.logger.error(
        `Plugin webview build for ${
          plugin.pathFromPluginsDir || plugin.name || 'unknown'
        } failed:`,
        error
      );
      // Return failure result instead of throwing
      return {
        htmlDir:
          webviewPluginDistDir ||
          path.join(distDir, plugin.name || 'unknown', 'html'),
        hasIndexHtml: false,
        hasAssets: false,
        success: false,
      };
    }
  }

  /**
   * Copy built webview files to the resource's html directory
   * @param sourceBuildDir Source directory containing the Vite build output
   * @param targetHtmlDir Target html directory within the resource
   * @returns Promise that resolves when the copy operation is complete
   */
  async copyBuildToResourceHtml(
    sourceBuildDir: string,
    targetHtmlDir: string
  ): Promise<void> {
    // Make sure target directory exists
    await fileSystem.ensureDir(targetHtmlDir);

    // Read all files from the source build directory
    const copyDir = async (src: string, dest: string) => {
      // Get all files in the source directory
      const filePaths = fileSystem.getFilePaths(src);

      for (const filePath of filePaths) {
        // Calculate the relative path from the source directory
        const relativePath = path.relative(src, filePath);
        // Calculate the destination path
        const destPath = path.join(dest, relativePath);

        // Ensure the destination directory exists
        await fileSystem.ensureDir(path.dirname(destPath));

        // Copy the file
        await fileSystem.copyFile(filePath, destPath);
      }
    };

    try {
      await copyDir(sourceBuildDir, targetHtmlDir);
      this.logger.info(
        `Successfully copied webview files from ${sourceBuildDir} to ${targetHtmlDir}`
      );
    } catch (error) {
      this.logger.error(`Error copying webview files:`, error);
      throw error;
    }
  }

  /**
   * Calculate plugin paths for webview building
   * @param plugin Plugin object
   * @param distDir Distribution directory
   * @returns Object with calculated paths
   */
  private calculatePluginPaths(plugin: Plugin, distDir: string) {
    // Determine the plugin's resource path in the dist directory
    let resourcePath;
    let pluginRelativePath;

    if (plugin.pathFromPluginsDir) {
      // Check if the path starts with 'plugins/' and strip it if needed
      const normalizedPluginPath = path.normalize(plugin.pathFromPluginsDir);
      const pluginsPathNormalized = path.normalize('plugins');
      const pathContainsPluginsPrefix =
        normalizedPluginPath.startsWith(pluginsPathNormalized) ||
        normalizedPluginPath.startsWith(pluginsPathNormalized + path.sep);

      if (pathContainsPluginsPrefix) {
        // Strip the 'plugins/' prefix to place resources directly in dist
        pluginRelativePath = path.relative(
          pluginsPathNormalized,
          normalizedPluginPath
        );
        this.logger.info(
          `Webview: Stripped 'plugins/' prefix from path: ${normalizedPluginPath} -> ${pluginRelativePath}`
        );
      } else {
        pluginRelativePath = normalizedPluginPath;
      }

      // Convert the plugin path to a resource path in dist
      // For example: "[misc]/example" -> "dist/[misc]/example"
      resourcePath = path.join(distDir, pluginRelativePath);
    } else if (plugin.fullPath) {
      // Extract resource name from fullPath if possible
      const pluginDir = path.basename(plugin.fullPath);
      resourcePath = path.join(distDir, pluginDir);
      pluginRelativePath = pluginDir;
    } else {
      // Fallback to name if nothing else is available
      resourcePath = path.join(distDir, plugin.name);
      pluginRelativePath = plugin.name;
    }

    // Create the html directory within the resource where webview files will be placed
    const htmlOutputDir = path.join(resourcePath, 'html');

    // Extract plugin path parts for the build output directory
    const pluginDistPathParts = pluginRelativePath
      ? pluginRelativePath.split('/')
      : [plugin.name];

    this.logger.info(
      'Plugin path parts for webview build:',
      pluginDistPathParts
    );

    // This is where Vite will directly output the build
    const webviewPluginDistDir = path.join(distDir, ...pluginDistPathParts);
    this.logger.info('Webview plugin dist directory:', webviewPluginDistDir);

    return {
      resourcePath,
      pluginRelativePath,
      htmlOutputDir,
      webviewPluginDistDir,
    };
  }

  /**
   * Generate App.tsx content for multiple plugins
   * @param plugins Array of plugins
   * @param srcDir Source directory
   * @returns Generated App.tsx content
   */
  private generateAppTsxContent(plugins: Plugin[], srcDir: string): string {
    let appContent = `// Auto-generated by cli: webview:build
// Generated on: ${new Date().toISOString()}\n\n`;

    const imports: string[] = [];
    const components: string[] = [];

    // Track used import names to avoid duplicates
    const usedImportNames = new Set<string>();

    for (const plugin of plugins) {
      if (!plugin.fullPath) continue;

      const pageFile = path.join(plugin.fullPath, 'html', 'Page.tsx');

      // Calculate relative path from src directory (Vite root) to the Page.tsx file
      // We need to make the import path relative to the src/webview/src directory
      const importPath = path.relative(srcDir, pageFile).replace(/\\/g, '/');
      // Make sure the path is properly formatted for import
      // If the path doesn't start with '.', it's not a relative path, so make it one
      const formattedImportPath = importPath.startsWith('.')
        ? importPath
        : `../../${importPath}`;

      // Get the plugin's path relative to plugins directory
      const relPlugin = plugin.pathFromPluginsDir;
      const parts = relPlugin.split('/');
      const namespace = parts.length > 1 ? parts[0] : '';
      const pluginName = parts.length > 1 ? parts.slice(1).join('_') : parts[0];

      // Clean up namespace and plugin name
      const nsClean = namespace.replace(/[\[\]\(\)\s-]/g, '');
      const pluginNameClean = pluginName
        .replace(/[\[\]\(\)\s]/g, '')
        .replace(/-/g, '_');

      // Create unique import name
      let importName = namespace
        ? `Page_${nsClean}_${pluginNameClean}`
        : `Page_${pluginNameClean}`;

      // Ensure import name is unique
      let counter = 1;
      let baseImportName = importName;
      while (usedImportNames.has(importName)) {
        importName = `${baseImportName}_${counter++}`;
      }
      usedImportNames.add(importName);

      // Create a key for React component - ensure it's unique and valid
      const key = namespace ? `${nsClean}/${pluginName}` : pluginName;

      imports.push(`import ${importName} from '${formattedImportPath}';`);
      components.push(`      <${importName} key="${key}" />`);
    }

    // Add imports
    appContent += imports.join('\n') + '\n\n';

    // Create App component
    appContent += `const App = () => {
  return (
    <>
${components.join('\n')}
    </>
  );
};

export default App;\n`;

    return appContent;
  }

  /**
   * Generate App.tsx content for a single plugin
   * @param plugin Plugin object
   * @param srcDir Source directory
   * @param pageFile Path to the Page.tsx file
   * @returns Generated App.tsx content
   */
  private generateSinglePluginAppTsxContent(
    plugin: Plugin,
    srcDir: string,
    pageFile: string
  ): string {
    let appContent = `// Auto-generated by cli: webview:buildPlugin
// Generated on: ${new Date().toISOString()}\n\n`;

    // Calculate relative path from src directory to the Page.tsx file
    const importPath = path.relative(srcDir, pageFile).replace(/\\/g, '/');
    const formattedImportPath = importPath.startsWith('.')
      ? importPath
      : `../../${importPath}`;

    // Get unique import name for this plugin
    let relPlugin = '';

    // Use pathFromPluginsDir if available, otherwise use name
    if (plugin.pathFromPluginsDir) {
      relPlugin = plugin.pathFromPluginsDir;
    } else if (plugin.name) {
      relPlugin = plugin.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    }

    const parts = relPlugin.split('/');
    const namespace = parts.length > 1 ? parts[0] : '';
    const pluginName = parts.length > 1 ? parts.slice(1).join('_') : parts[0];

    // Clean up namespace and plugin name
    const nsClean = namespace.replace(/[\[\]\(\)\s-]/g, '');
    const pluginNameClean = pluginName
      .replace(/[\[\]\(\)\s]/g, '')
      .replace(/-/g, '_');

    // Create import name
    const importName = namespace
      ? `Page_${nsClean}_${pluginNameClean}`
      : `Page_${pluginNameClean}`;

    // Create a key for React component
    const key = namespace ? `${nsClean}/${pluginName}` : pluginName;

    // Add the import
    appContent += `import ${importName} from '${formattedImportPath}';\n\n`;

    // Create App component that only includes this plugin
    appContent += `const App = () => {
  return (
    <>
      <${importName} key="${key}" />
    </>
  );
};

export default App;\n`;

    return appContent;
  }

  /**
   * Generate main.tsx content
   * @returns Generated main.tsx content
   */
  private generateMainTsxContent(): string {
    return `
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`;
  }

  /**
   * Ensure index.html exists and has the correct content
   * @param srcDir Source directory
   * @param title Title for the HTML page
   */
  private async ensureIndexHtml(srcDir: string, title: string): Promise<void> {
    const indexHtmlPath = path.join(srcDir, 'index.html');
    const indexHtmlExists = await fileSystem.exists(indexHtmlPath);

    if (!indexHtmlExists) {
      const indexHtmlContent = generateSimpleHtmlContent(title, './main.tsx');
      await fileSystem.writeFile(indexHtmlPath, indexHtmlContent);
      this.logger.info(`Generated ${indexHtmlPath}`);
    } else {
      // File exists, check if it has the correct main.tsx reference
      const indexHtmlContent = await fileSystem.readFile(indexHtmlPath, 'utf8');
      if (
        !indexHtmlContent.includes('./main.tsx') &&
        (indexHtmlContent.includes('/webview/main.tsx') ||
          indexHtmlContent.includes('"/main.tsx"'))
      ) {
        // Fix the path
        const updatedContent = indexHtmlContent
          .replace(/["']\/webview\/main\.tsx["']/g, '"./main.tsx"')
          .replace(/["']\/main\.tsx["']/g, '"./main.tsx"');

        await fileSystem.writeFile(indexHtmlPath, updatedContent);
        this.logger.info(`Updated ${indexHtmlPath} with correct main.tsx path`);
      }
    }
  }

  /**
   * Ensure index.css exists and has the correct content
   * @param srcDir Source directory
   */
  private async ensureIndexCss(srcDir: string): Promise<void> {
    const indexCssPath = path.join(srcDir, 'index.css');
    const indexCssExists = await fileSystem.exists(indexCssPath);

    if (!indexCssExists) {
      // Create a basic CSS file
      const indexCssContent = `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}

.h-dvh {
  height: 100dvh;
}
`;
      await fileSystem.writeFile(indexCssPath, indexCssContent);
      this.logger.info(`Generated ${indexCssPath}`);
    }
  }

  /**
   * Run Vite build
   */
  private async runViteBuild(): Promise<void> {
    this.logger.info('Running Vite build...');
    try {
      // Always run Vite build directly to avoid recursion
      const buildCommand = 'npx vite build';
      this.logger.info(`Executing: ${buildCommand}`);

      // use spawn to stream logs without buffering large output
      const child = spawn(buildCommand, {
        cwd: process.cwd(),
        shell: true,
        stdio: 'inherit',
      });
      await new Promise<void>((resolve, reject) => {
        child.on('close', (code) =>
          code === 0
            ? resolve()
            : reject(new Error(`Build command failed with exit code ${code}`))
        );
      });
    } catch (error: any) {
      this.logger.error('Vite build failed:', error);

      // Add more helpful error information
      let errorMessage = `Vite build failed: ${error?.message || error}`;

      // Check if index.html exists and has correct format
      const indexHtmlPath = path.join(
        process.cwd(),
        'src/webview/src/index.html'
      );
      if (await fileSystem.exists(indexHtmlPath)) {
        try {
          const indexHtmlContent = await fileSystem.readFile(
            indexHtmlPath,
            'utf8'
          );

          if (
            !indexHtmlContent.includes('./main.tsx') &&
            !indexHtmlContent.includes('main.tsx')
          ) {
            errorMessage +=
              '\nPossible cause: index.html does not reference main.tsx correctly.';
          }
        } catch (err) {
          errorMessage +=
            '\nPossible cause: index.html exists but cannot be read.';
        }
      } else {
        errorMessage += '\nPossible cause: index.html does not exist.';
      }

      throw new Error(errorMessage);
    }
  }
}

// Export a singleton instance for backward compatibility
export const webviewBuilder = new WebviewBuilder();

// Export individual functions for backward compatibility
export const buildWebview = webviewBuilder.buildWebview.bind(webviewBuilder);
export const buildPluginWebview =
  webviewBuilder.buildPluginWebview.bind(webviewBuilder);
export const copyBuildToResourceHtml =
  webviewBuilder.copyBuildToResourceHtml.bind(webviewBuilder);
