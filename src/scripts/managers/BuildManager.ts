import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import * as esbuild from 'esbuild';
import { spawn } from 'child_process';
import { FileManager } from './FileManager.js';
import { Plugin } from '../types/Plugin.js';
import { File } from '../types/File.js';
import { PluginManifest } from '../types/Manifest.js';

/**
 * Build manager
 * This class provides functionality to build plugins by copying files to a dist directory
 */
class BuildManager {
  private fileManager: FileManager;
  private distPath: string;
  private initialized: boolean = false;

  /**
   * Creates a new BuildManager instance
   * @param fileManager The FileManager instance to use for file operations
   * @param distPath Optional path to the distribution directory
   */
  constructor(fileManager: FileManager, distPath: string = 'dist') {
    this.fileManager = fileManager;
    this.distPath = path.resolve(distPath);
  }

  /**
   * Initializes the build manager
   * Must be called before using other methods
   */
  async initialize(): Promise<void> {
    try {
      // Create the dist directory if it doesn't exist
      if (!fsSync.existsSync(this.distPath)) {
        await fs.mkdir(this.distPath, { recursive: true });
      }

      this.initialized = true;
      console.log('BuildManager initialized successfully');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error('Error initializing BuildManager:', error);
      throw new Error(`Failed to initialize BuildManager: ${errorMessage}`);
    }
  }

  /**
   * Builds a plugin by copying all files to the dist directory
   * @param pluginNameOrPath The name or path of the plugin to build
   */
  async buildPlugin(pluginNameOrPath: string): Promise<void> {
    this.ensureInitialized();

    try {
      // Get the plugin
      const plugin = this.getPluginFromNameOrPath(pluginNameOrPath);

      if (!plugin) {
        throw new Error(`Plugin not found: ${pluginNameOrPath}`);
      }

      console.log(`Building plugin: ${plugin.pluginName}`);

      // Create the destination directory
      const destDir = this.getPluginDestDir(plugin);
      await fs.mkdir(destDir, { recursive: true });

      // Build all file types
      await Promise.all([
        this.buildPluginLua(plugin),
        this.buildPluginJson(plugin),
        this.buildPluginTs(plugin),
        this.buildPluginJs(plugin),
        this.buildPluginPageTsx(plugin),
        this.buildPluginManifest(plugin), // Add this line to build the manifest
      ]);

      console.log(
        `✓ Plugin ${
          plugin.pluginName
        } built successfully to ${this.pathToDisplay(destDir)}`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`Error building plugin ${pluginNameOrPath}:`, error);
      throw new Error(
        `Failed to build plugin ${pluginNameOrPath}: ${errorMessage}`
      );
    }
  }

  /**
   * Builds Lua files for a plugin
   * @param pluginNameOrPath The name or path of the plugin, or the Plugin object
   */
  async buildPluginLua(pluginNameOrPath: string | Plugin): Promise<void> {
    this.ensureInitialized();

    try {
      const plugin =
        typeof pluginNameOrPath === 'string'
          ? this.getPluginFromNameOrPath(pluginNameOrPath)
          : pluginNameOrPath;

      if (!plugin) {
        throw new Error(`Plugin not found: ${pluginNameOrPath}`);
      }

      // Get all Lua files
      const luaFiles = plugin.files.filter((file) =>
        file.fileName.endsWith('.lua')
      );

      if (luaFiles.length === 0) {
        console.log(`No Lua files found in plugin ${plugin.pluginName}`);
        return;
      }

      await this.copyFilesToDist(plugin, luaFiles);
      console.log(
        `✓ Built ${luaFiles.length} Lua file(s) for plugin ${plugin.pluginName}`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (typeof pluginNameOrPath === 'string') {
        console.error(
          `Error building Lua files for plugin ${pluginNameOrPath}:`,
          error
        );
        throw new Error(
          `Failed to build Lua files for plugin ${pluginNameOrPath}: ${errorMessage}`
        );
      } else {
        console.error(
          `Error building Lua files for plugin ${pluginNameOrPath.pluginName}:`,
          error
        );
        throw new Error(
          `Failed to build Lua files for plugin ${pluginNameOrPath.pluginName}: ${errorMessage}`
        );
      }
    }
  }

  /**
   * Builds JSON files for a plugin
   * @param pluginNameOrPath The name or path of the plugin, or the Plugin object
   */
  async buildPluginJson(pluginNameOrPath: string | Plugin): Promise<void> {
    this.ensureInitialized();

    try {
      const plugin =
        typeof pluginNameOrPath === 'string'
          ? this.getPluginFromNameOrPath(pluginNameOrPath)
          : pluginNameOrPath;

      if (!plugin) {
        throw new Error(`Plugin not found: ${pluginNameOrPath}`);
      }

      // Get all JSON files
      const jsonFiles = plugin.files.filter((file) =>
        file.fileName.endsWith('.json')
      );

      if (jsonFiles.length === 0) {
        console.log(`No JSON files found in plugin ${plugin.pluginName}`);
        return;
      }

      await this.copyFilesToDist(plugin, jsonFiles);
      console.log(
        `✓ Built ${jsonFiles.length} JSON file(s) for plugin ${plugin.pluginName}`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (typeof pluginNameOrPath === 'string') {
        console.error(
          `Error building JSON files for plugin ${pluginNameOrPath}:`,
          error
        );
        throw new Error(
          `Failed to build JSON files for plugin ${pluginNameOrPath}: ${errorMessage}`
        );
      } else {
        console.error(
          `Error building JSON files for plugin ${pluginNameOrPath.pluginName}:`,
          error
        );
        throw new Error(
          `Failed to build JSON files for plugin ${pluginNameOrPath.pluginName}: ${errorMessage}`
        );
      }
    }
  }

  /**
   * Builds TypeScript files for a plugin
   * @param pluginNameOrPath The name or path of the plugin, or the Plugin object
   */
  async buildPluginTs(pluginNameOrPath: string | Plugin): Promise<void> {
    this.ensureInitialized();

    try {
      const plugin =
        typeof pluginNameOrPath === 'string'
          ? this.getPluginFromNameOrPath(pluginNameOrPath)
          : pluginNameOrPath;

      if (!plugin) {
        throw new Error(`Plugin not found: ${pluginNameOrPath}`);
      }

      // Get all TypeScript files (excluding .tsx files which are handled separately)
      const tsFiles = plugin.files.filter(
        (file) =>
          file.fileName.endsWith('.ts') && !file.fileName.endsWith('.tsx')
      );

      if (tsFiles.length === 0) {
        console.log(`No TypeScript files found in plugin ${plugin.pluginName}`);
        return;
      }

      const destDir = this.getPluginDestDir(plugin);

      // Process each TypeScript file
      for (const file of tsFiles) {
        // Get the relative path within the plugin
        const relativePath = path.relative(plugin.fullPath, file.fullPath);

        // Change the extension from .ts to .js for the output file
        const outputRelativePath = relativePath.replace(/\.ts$/, '.js');
        const outputPath = path.join(destDir, outputRelativePath);

        // Create the destination directory if it doesn't exist
        const outputDir = path.dirname(outputPath);
        await fs.mkdir(outputDir, { recursive: true });

        // Determine if this is a server-side script
        const isServerScript = this.isServerScript(file.fullPath);
        const externalPackages = this.getExternalPackages(isServerScript);

        // Configure loader based on file type
        const loader: Record<string, esbuild.Loader> = {
          '.ts': 'ts',
          '.js': 'js',
        };

        console.log(`Bundling TypeScript file: ${relativePath}`);

        try {
          // Bundle the file
          const result = await esbuild.build({
            entryPoints: [file.fullPath],
            bundle: true,
            outfile: outputPath,
            format: 'iife', // Use IIFE format for FiveM compatibility
            target: 'es2017',
            minify: false,
            sourcemap: 'external',
            loader,
            logLevel: 'info',
            external: externalPackages,
            // Use node platform for server scripts, browser platform for client scripts
            platform: isServerScript ? 'node' : 'browser',
          });

          // Check for errors
          if (result.errors.length > 0) {
            console.error(`Errors bundling ${file.fullPath}:`, result.errors);
            throw new Error(
              `Failed to bundle ${file.fullPath}: ${result.errors.join(', ')}`
            );
          }

          // Verify the file was created
          if (!fsSync.existsSync(outputPath)) {
            throw new Error(
              `Failed to verify file exists after bundling: ${outputPath}`
            );
          }
        } catch (bundleError) {
          console.error(
            `Error bundling TypeScript file ${file.fullPath}:`,
            bundleError
          );
          throw bundleError;
        }
      }

      console.log(
        `✓ Built ${tsFiles.length} TypeScript file(s) for plugin ${plugin.pluginName}`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (typeof pluginNameOrPath === 'string') {
        console.error(
          `Error building TypeScript files for plugin ${pluginNameOrPath}:`,
          error
        );
        throw new Error(
          `Failed to build TypeScript files for plugin ${pluginNameOrPath}: ${errorMessage}`
        );
      } else {
        console.error(
          `Error building TypeScript files for plugin ${pluginNameOrPath.pluginName}:`,
          error
        );
        throw new Error(
          `Failed to build TypeScript files for plugin ${pluginNameOrPath.pluginName}: ${errorMessage}`
        );
      }
    }
  }

  /**
   * Builds JavaScript files for a plugin
   * @param pluginNameOrPath The name or path of the plugin, or the Plugin object
   */
  async buildPluginJs(pluginNameOrPath: string | Plugin): Promise<void> {
    this.ensureInitialized();

    try {
      const plugin =
        typeof pluginNameOrPath === 'string'
          ? this.getPluginFromNameOrPath(pluginNameOrPath)
          : pluginNameOrPath;

      if (!plugin) {
        throw new Error(`Plugin not found: ${pluginNameOrPath}`);
      }

      // Get all JavaScript files (excluding .jsx files)
      const jsFiles = plugin.files.filter(
        (file) =>
          file.fileName.endsWith('.js') && !file.fileName.endsWith('.jsx')
      );

      if (jsFiles.length === 0) {
        console.log(`No JavaScript files found in plugin ${plugin.pluginName}`);
        return;
      }

      const destDir = this.getPluginDestDir(plugin);

      // Process each JavaScript file
      for (const file of jsFiles) {
        // Get the relative path within the plugin
        const relativePath = path.relative(plugin.fullPath, file.fullPath);
        const outputPath = path.join(destDir, relativePath);

        // Create the destination directory if it doesn't exist
        const outputDir = path.dirname(outputPath);
        await fs.mkdir(outputDir, { recursive: true });

        // Determine if this is a server-side script
        const isServerScript = this.isServerScript(file.fullPath);
        const externalPackages = this.getExternalPackages(isServerScript);

        console.log(`Bundling JavaScript file: ${relativePath}`);

        try {
          // Bundle the file
          const result = await esbuild.build({
            entryPoints: [file.fullPath],
            bundle: true,
            outfile: outputPath,
            format: 'iife', // Use IIFE format for FiveM compatibility
            target: 'es2017',
            minify: false,
            sourcemap: 'external',
            external: externalPackages,
            // Use node platform for server scripts, browser platform for client scripts
            platform: isServerScript ? 'node' : 'browser',
          });

          // Check for errors
          if (result.errors.length > 0) {
            console.error(`Errors bundling ${file.fullPath}:`, result.errors);
            throw new Error(
              `Failed to bundle ${file.fullPath}: ${result.errors.join(', ')}`
            );
          }

          // Verify the file was created
          if (!fsSync.existsSync(outputPath)) {
            throw new Error(
              `Failed to verify file exists after bundling: ${outputPath}`
            );
          }
        } catch (bundleError) {
          console.error(
            `Error bundling JavaScript file ${file.fullPath}:`,
            bundleError
          );
          throw bundleError;
        }
      }

      console.log(
        `✓ Built ${jsFiles.length} JavaScript file(s) for plugin ${plugin.pluginName}`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (typeof pluginNameOrPath === 'string') {
        console.error(
          `Error building JavaScript files for plugin ${pluginNameOrPath}:`,
          error
        );
        throw new Error(
          `Failed to build JavaScript files for plugin ${pluginNameOrPath}: ${errorMessage}`
        );
      } else {
        console.error(
          `Error building JavaScript files for plugin ${pluginNameOrPath.pluginName}:`,
          error
        );
        throw new Error(
          `Failed to build JavaScript files for plugin ${pluginNameOrPath.pluginName}: ${errorMessage}`
        );
      }
    }
  }

  /**
   * Builds TSX (TypeScript JSX) page files for a plugin
   * @param pluginNameOrPath The name or path of the plugin, or the Plugin object
   */
  async buildPluginPageTsx(pluginNameOrPath: string | Plugin): Promise<void> {
    this.ensureInitialized();

    try {
      // Get the plugin object
      const plugin =
        typeof pluginNameOrPath === 'string'
          ? this.getPluginFromNameOrPath(pluginNameOrPath)
          : pluginNameOrPath;

      if (!plugin) {
        throw new Error(`Plugin not found: ${pluginNameOrPath}`);
      }

      // Find the Page.tsx file in the html directory
      const pageTsxFile = plugin.files.find(
        (file) =>
          file.fileName === 'Page.tsx' &&
          (file.fullPath.includes('/html/') ||
            file.fullPath.includes('\\html\\'))
      );

      if (!pageTsxFile) {
        console.log(`No Page.tsx file found in plugin ${plugin.pluginName}`);
        return;
      }

      console.log(
        `Building webview for plugin ${plugin.pluginName} from ${pageTsxFile.displayPath}`
      );

      // Set up paths
      const webviewDir = path.resolve('src/webview');
      const srcDir = path.join(webviewDir, 'src');
      const pluginDistDir = this.getPluginDestDir(plugin);
      const htmlOutputDir = path.join(pluginDistDir, 'html');

      // Ensure directories exist
      await fs.mkdir(srcDir, { recursive: true });
      await fs.mkdir(htmlOutputDir, { recursive: true });

      // Backup original App.tsx if it exists
      const appFilePath = path.join(srcDir, 'App.tsx');
      let originalAppContent = '';
      if (fsSync.existsSync(appFilePath)) {
        originalAppContent = await fs.readFile(appFilePath, 'utf-8');
      }

      try {
        // Generate and write temporary App.tsx
        const appContent = this.generateAppTsxContent(srcDir, pageTsxFile);
        await fs.writeFile(appFilePath, appContent, 'utf-8');
        console.log(
          `Generated temporary App.tsx for plugin ${plugin.pluginName}`
        );

        // Ensure other necessary files exist
        await this.ensureWebviewFiles(srcDir);

        // Run Vite build
        console.log(`Running Vite build for plugin ${plugin.pluginName}...`);
        await this.runViteBuild(htmlOutputDir);

        // Verify the build output
        const indexHtmlPath = path.join(htmlOutputDir, 'index.html');
        if (!fsSync.existsSync(indexHtmlPath)) {
          throw new Error(
            `Failed to generate index.html for plugin ${plugin.pluginName}`
          );
        }

        console.log(
          `✓ Built webview for plugin ${
            plugin.pluginName
          } to ${this.pathToDisplay(htmlOutputDir)}`
        );
      } finally {
        // Restore the original App.tsx
        if (originalAppContent) {
          await fs.writeFile(appFilePath, originalAppContent, 'utf-8');
          console.log(`Restored original App.tsx`);
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const pluginName =
        typeof pluginNameOrPath === 'string'
          ? pluginNameOrPath
          : pluginNameOrPath.pluginName;

      console.error(`Error building webview for plugin ${pluginName}:`, error);
      throw new Error(
        `Failed to build webview for plugin ${pluginName}: ${errorMessage}`
      );
    }
  }

  /**
   * Runs the Vite build process
   * @param outputDir The directory to output the build to
   * @private
   */
  private async runViteBuild(outputDir: string): Promise<void> {
    const buildCommand = `npx vite build --outDir=${outputDir}`;
    console.log(`Executing: ${buildCommand}`);

    // Use spawn to run the build command
    const child = spawn(buildCommand, {
      cwd: process.cwd(),
      shell: true,
      stdio: 'inherit',
    });

    // Wait for the build to complete
    await new Promise<void>((resolve, reject) => {
      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Vite build failed with exit code ${code}`));
        }
      });
    });
  }

  /**
   * Generates App.tsx content for a plugin's Page.tsx
   * @param srcDir Source directory where App.tsx will be created
   * @param pageTsxFile The Page.tsx file
   * @returns Generated App.tsx content
   * @private
   */
  private generateAppTsxContent(srcDir: string, pageTsxFile: File): string {
    // Calculate relative path from src directory to the Page.tsx file
    const importPath = path
      .relative(srcDir, pageTsxFile.fullPath)
      .replace(/\\/g, '/');
    const formattedImportPath = importPath.startsWith('.')
      ? importPath
      : `../../${importPath}`;

    // Create the App.tsx content
    return `// Auto-generated by BuildManager
// Generated on: ${new Date().toISOString()}

import Page from '${formattedImportPath}';

function App() {
  return <Page />;
}

export default App;
`;
  }

  /**
   * Ensures all necessary files exist for the webview build
   * @param srcDir Source directory
   * @private
   */
  private async ensureWebviewFiles(srcDir: string): Promise<void> {
    const webviewSrcDir = path.resolve('src/webview/src');

    // Check if the webview src directory exists
    if (!fsSync.existsSync(webviewSrcDir)) {
      throw new Error(`Webview src directory not found: ${webviewSrcDir}`);
    }

    // Copy main.tsx if it doesn't exist in the target directory
    const mainTsxPath = path.join(srcDir, 'main.tsx');
    if (!fsSync.existsSync(mainTsxPath)) {
      const sourcePath = path.join(webviewSrcDir, 'main.tsx');
      if (fsSync.existsSync(sourcePath)) {
        await fs.copyFile(sourcePath, mainTsxPath);
        console.log(`Copied main.tsx from ${sourcePath}`);
      }
    }

    // Copy index.html if it doesn't exist in the target directory
    const indexHtmlPath = path.join(srcDir, 'index.html');
    if (!fsSync.existsSync(indexHtmlPath)) {
      const sourcePath = path.join(webviewSrcDir, 'index.html');
      if (fsSync.existsSync(sourcePath)) {
        await fs.copyFile(sourcePath, indexHtmlPath);
        console.log(`Copied index.html from ${sourcePath}`);
      }
    }

    // Copy index.css if it doesn't exist in the target directory
    const indexCssPath = path.join(srcDir, 'index.css');
    if (!fsSync.existsSync(indexCssPath)) {
      const sourcePath = path.join(webviewSrcDir, 'index.css');
      if (fsSync.existsSync(sourcePath)) {
        await fs.copyFile(sourcePath, indexCssPath);
        console.log(`Copied index.css from ${sourcePath}`);
      }
    }
  }

  /**
   * Copies files to the dist directory
   * @param plugin The plugin object
   * @param files The files to copy
   * @private
   */
  private async copyFilesToDist(plugin: Plugin, files: File[]): Promise<void> {
    const destDir = this.getPluginDestDir(plugin);

    // Ensure the destination directory exists
    await fs.mkdir(destDir, { recursive: true });

    // Copy each file, preserving directory structure within the plugin
    for (const file of files) {
      // Get the relative path within the plugin
      const relativePath = path.relative(plugin.fullPath, file.fullPath);
      const destPath = path.join(destDir, relativePath);

      // Create the destination directory if it doesn't exist
      const destFileDir = path.dirname(destPath);
      await fs.mkdir(destFileDir, { recursive: true });

      // Copy the file
      await fs.copyFile(file.fullPath, destPath);
    }
  }

  /**
   * Gets the destination directory for a plugin
   * @param plugin The plugin object
   * @private
   */
  private getPluginDestDir(plugin: Plugin): string {
    // Use the plugin's parent folders to build the destination path
    let destPath = this.distPath;

    // If the plugin has parent folders, include them in the path
    if (plugin.parents.length > 0) {
      // We only need the last parent entry which contains the full parent path
      // For example, if parents are ['[misc2]', '[misc2]/[sub-sub-folder]'],
      // we only need the last one which already has the full path structure
      const parentPath = plugin.parents[plugin.parents.length - 1];

      // Combine the parent path with the plugin name
      destPath = path.join(this.distPath, parentPath, plugin.pluginName);
    } else {
      // No parent folders, just place directly under dist
      destPath = path.join(this.distPath, plugin.pluginName);
    }

    return destPath;
  }

  /**
   * Gets a Plugin object from a name or path
   * @param pluginNameOrPath The name or path of the plugin
   * @private
   */
  private getPluginFromNameOrPath(
    pluginNameOrPath: string
  ): Plugin | undefined {
    if (pluginNameOrPath.includes(path.sep)) {
      // It's a path
      return this.fileManager.getPluginByPath(pluginNameOrPath);
    } else {
      // It's a name
      return this.fileManager.getPlugin(pluginNameOrPath);
    }
  }

  /**
   * Converts a path to display format (with forward slashes)
   * @param filePath The path to convert
   * @private
   */
  private pathToDisplay(filePath: string): string {
    return filePath.replace(/\\/g, '/');
  }

  /**
   * Builds all plugins
   */
  async buildAllPlugins(): Promise<void> {
    this.ensureInitialized();

    try {
      const plugins = this.fileManager.getAllPlugins();

      if (plugins.length === 0) {
        console.log('No plugins found to build');
        return;
      }

      console.log(`Building all ${plugins.length} plugins...`);

      for (const plugin of plugins) {
        await this.buildPlugin(plugin.fullPath);
      }

      console.log(`✓ All ${plugins.length} plugins built successfully`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error('Error building all plugins:', error);
      throw new Error(`Failed to build all plugins: ${errorMessage}`);
    }
  }

  /**
   * Cleans the dist directory
   */
  async clean(): Promise<void> {
    this.ensureInitialized();

    try {
      console.log(
        `Cleaning dist directory: ${this.pathToDisplay(this.distPath)}`
      );

      // Check if the directory exists
      if (fsSync.existsSync(this.distPath)) {
        // Remove all files and subdirectories
        await fs.rm(this.distPath, { recursive: true, force: true });

        // Recreate the empty directory
        await fs.mkdir(this.distPath, { recursive: true });
      }

      console.log('✓ Dist directory cleaned successfully');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error('Error cleaning dist directory:', error);
      throw new Error(`Failed to clean dist directory: ${errorMessage}`);
    }
  }

  /**
   * Helper method to ensure the manager is initialized
   * @private
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error(
        'BuildManager must be initialized before use. Call initialize() first.'
      );
    }
  }

  /**
   * Determines if a file is a server-side script based on its path
   * @param filePath Path to check
   * @returns Whether the file is a server-side script
   * @private
   */
  private isServerScript(filePath: string): boolean {
    return filePath.includes('/server/') || filePath.includes('\\server\\');
  }

  /**
   * Gets the list of packages to not inline
   * @param isServerScript Whether the file is a server-side script
   * @returns List of external packages
   * @private
   */
  private getExternalPackages(isServerScript: boolean): string[] {
    // For server scripts, make Node.js modules external
    return isServerScript
      ? [
          'http',
          'https',
          'url',
          'fs',
          'path',
          'os',
          'crypto',
          'buffer',
          'stream',
          'util',
          'events',
          'zlib',
          'net',
          'tls',
          'dns',
          'child_process',
        ]
      : [];
  }

  /**
   * Builds an fxmanifest.lua file from a plugin.json file
   * @param pluginNameOrPath The name or path of the plugin, or the Plugin object
   */
  async buildPluginManifest(pluginNameOrPath: string | Plugin): Promise<void> {
    this.ensureInitialized();

    try {
      const plugin =
        typeof pluginNameOrPath === 'string'
          ? this.getPluginFromNameOrPath(pluginNameOrPath)
          : pluginNameOrPath;

      if (!plugin) {
        throw new Error(`Plugin not found: ${pluginNameOrPath}`);
      }

      // Check if the plugin has a manifest
      if (!plugin.manifest) {
        console.warn(
          `No manifest found for plugin ${plugin.pluginName}, skipping fxmanifest.lua generation`
        );
        return;
      }

      // Generate the fxmanifest.lua content
      const manifestContent = this.generateFxManifest(plugin);

      // Get the destination directory for the plugin
      const destDir = this.getPluginDestDir(plugin);

      // Ensure the destination directory exists
      await fs.mkdir(destDir, { recursive: true });

      // Write the fxmanifest.lua file
      const manifestPath = path.join(destDir, 'fxmanifest.lua');
      await fs.writeFile(manifestPath, manifestContent, 'utf-8');

      console.log(`✓ Generated fxmanifest.lua for plugin ${plugin.pluginName}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (typeof pluginNameOrPath === 'string') {
        console.error(
          `Error building manifest for plugin ${pluginNameOrPath}:`,
          error
        );
        throw new Error(
          `Failed to build manifest for plugin ${pluginNameOrPath}: ${errorMessage}`
        );
      } else {
        console.error(
          `Error building manifest for plugin ${pluginNameOrPath.pluginName}:`,
          error
        );
        throw new Error(
          `Failed to build manifest for plugin ${pluginNameOrPath.pluginName}: ${errorMessage}`
        );
      }
    }
  }

  /**
   * Generates fxmanifest.lua content from a plugin manifest
   * @param plugin The plugin object containing the manifest
   * @returns The fxmanifest.lua content as a string
   * @private
   */
  private generateFxManifest(plugin: Plugin): string {
    const manifest = plugin.manifest!;
    let content = '';

    // Add header comment
    content += `-- Generated from plugin.json by BuildManager\n`;
    content += `-- Plugin: ${plugin.pluginName}\n`;
    content += `-- Generated on: ${new Date().toISOString()}\n\n`;

    // Add resource metadata
    content += `-- Resource Metadata\n`;

    // FX Version (default to "cerulean" if not specified)
    content += `fx_version '${manifest.fx_version || 'cerulean'}'\n`;

    // Games
    if (manifest.games && manifest.games.length > 0) {
      content += `games { '${manifest.games.join("', '")}' }\n`;
    } else {
      // Default to GTA5 if not specified
      content += `games { 'gta5' }\n`;
    }

    content += `\n`;

    // Basic metadata
    if (manifest.author) {
      content += `author '${this.escapeLuaString(manifest.author)}'\n`;
    }

    if (manifest.description) {
      content += `description '${this.escapeLuaString(
        manifest.description
      )}'\n`;
    }

    if (manifest.version) {
      content += `version '${this.escapeLuaString(manifest.version)}'\n`;
    }

    content += `\n`;

    // Scripts
    content += `-- What to run\n`;

    // Client scripts
    if (manifest.client_scripts) {
      if (Array.isArray(manifest.client_scripts)) {
        if (manifest.client_scripts.length === 1) {
          content += `client_script '${this.escapeLuaString(
            manifest.client_scripts[0]
          )}'\n`;
        } else if (manifest.client_scripts.length > 1) {
          content += `client_scripts {\n`;
          for (const script of manifest.client_scripts) {
            content += `    '${this.escapeLuaString(script)}',\n`;
          }
          content += `}\n`;
        }
      } else {
        content += `client_script '${this.escapeLuaString(
          manifest.client_scripts
        )}'\n`;
      }
    }

    // Server scripts
    if (manifest.server_scripts) {
      if (Array.isArray(manifest.server_scripts)) {
        if (manifest.server_scripts.length === 1) {
          content += `server_script '${this.escapeLuaString(
            manifest.server_scripts[0]
          )}'\n`;
        } else if (manifest.server_scripts.length > 1) {
          content += `server_scripts {\n`;
          for (const script of manifest.server_scripts) {
            content += `    '${this.escapeLuaString(script)}',\n`;
          }
          content += `}\n`;
        }
      } else {
        content += `server_script '${this.escapeLuaString(
          manifest.server_scripts
        )}'\n`;
      }
    }

    // Shared scripts
    if (manifest.shared_scripts) {
      if (Array.isArray(manifest.shared_scripts)) {
        if (manifest.shared_scripts.length === 1) {
          content += `shared_script '${this.escapeLuaString(
            manifest.shared_scripts[0]
          )}'\n`;
        } else if (manifest.shared_scripts.length > 1) {
          content += `shared_scripts {\n`;
          for (const script of manifest.shared_scripts) {
            content += `    '${this.escapeLuaString(script)}',\n`;
          }
          content += `}\n`;
        }
      } else {
        content += `shared_script '${this.escapeLuaString(
          manifest.shared_scripts
        )}'\n`;
      }
    }

    // UI page
    if (manifest.ui_page) {
      content += `\n-- UI\n`;
      content += `ui_page '${this.escapeLuaString(manifest.ui_page)}'\n`;
    }

    // Files
    if (manifest.files && manifest.files.length > 0) {
      content += `\n-- Files\n`;
      content += `files {\n`;
      for (const file of manifest.files) {
        content += `    '${this.escapeLuaString(file)}',\n`;
      }
      content += `}\n`;
    }

    // Data files
    if (manifest.data_files && manifest.data_files.length > 0) {
      content += `\n-- Data Files\n`;
      for (const dataFile of manifest.data_files) {
        if (Array.isArray(dataFile.files)) {
          for (const file of dataFile.files) {
            content += `data_file '${this.escapeLuaString(
              dataFile.type
            )}' '${this.escapeLuaString(file)}'\n`;
          }
        } else {
          content += `data_file '${this.escapeLuaString(
            dataFile.type
          )}' '${this.escapeLuaString(dataFile.files)}'\n`;
        }
      }
    }

    // Dependencies
    if (manifest.dependencies && manifest.dependencies.length > 0) {
      content += `\n-- Dependencies\n`;
      if (manifest.dependencies.length === 1) {
        content += `dependency '${this.escapeLuaString(
          manifest.dependencies[0]
        )}'\n`;
      } else {
        content += `dependencies {\n`;
        for (const dep of manifest.dependencies) {
          content += `    '${this.escapeLuaString(dep)}',\n`;
        }
        content += `}\n`;
      }
    }

    // Provides
    if (manifest.provide) {
      content += `\n-- Provides\n`;
      if (Array.isArray(manifest.provide)) {
        for (const provide of manifest.provide) {
          content += `provide '${this.escapeLuaString(provide)}'\n`;
        }
      } else {
        content += `provide '${this.escapeLuaString(manifest.provide)}'\n`;
      }
    }

    // Constraints (special handling)
    if (manifest.constraints) {
      content += `\n-- Runtime Constraints\n`;
      content += `dependencies {\n`;

      if (manifest.constraints.server) {
        content += `    '/server:${manifest.constraints.server}',\n`;
      }

      if (
        manifest.constraints.policy &&
        manifest.constraints.policy.length > 0
      ) {
        for (const policy of manifest.constraints.policy) {
          content += `    '/policy:${policy}',\n`;
        }
      }

      if (manifest.constraints.onesync) {
        content += `    '/onesync',\n`;
      }

      if (manifest.constraints.gameBuild) {
        content += `    '/gameBuild:${manifest.constraints.gameBuild}',\n`;
      }

      if (
        manifest.constraints.natives &&
        manifest.constraints.natives.length > 0
      ) {
        for (const native of manifest.constraints.natives) {
          content += `    '/native:${native}',\n`;
        }
      }

      content += `}\n`;
    }

    // Exports
    if (manifest.exports && manifest.exports.length > 0) {
      content += `\n-- Exports\n`;
      content += `exports {\n`;
      for (const exp of manifest.exports) {
        content += `    '${this.escapeLuaString(exp)}',\n`;
      }
      content += `}\n`;
    }

    // Server exports
    if (manifest.server_exports && manifest.server_exports.length > 0) {
      content += `\n-- Server Exports\n`;
      content += `server_exports {\n`;
      for (const exp of manifest.server_exports) {
        content += `    '${this.escapeLuaString(exp)}',\n`;
      }
      content += `}\n`;
    }

    // Map flag
    if (manifest.is_map) {
      content += `\n-- Map flag\n`;
      content += `this_is_a_map 'yes'\n`;
    }

    // Server only
    if (manifest.server_only) {
      content += `\n-- Server only\n`;
      content += `server_only 'yes'\n`;
    }

    // Loadscreen
    if (manifest.loadscreen) {
      content += `\n-- Loadscreen\n`;
      content += `loadscreen '${this.escapeLuaString(manifest.loadscreen)}'\n`;

      if (manifest.loadscreen_manual_shutdown) {
        content += `loadscreen_manual_shutdown 'yes'\n`;
      }
    }

    // Add any custom properties
    const customProps = this.getCustomProperties(manifest);
    if (Object.keys(customProps).length > 0) {
      content += `\n-- Additional Metadata\n`;
      for (const [key, value] of Object.entries(customProps)) {
        if (Array.isArray(value)) {
          for (const val of value) {
            content += `${key} '${this.escapeLuaString(String(val))}'\n`;
          }
        } else {
          content += `${key} '${this.escapeLuaString(String(value))}'\n`;
        }
      }
    }

    return content;
  }

  /**
   * Escapes special characters in Lua strings
   * @param str The string to escape
   * @returns Escaped string safe for Lua
   * @private
   */
  private escapeLuaString(str: string): string {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
  }

  /**
   * Gets custom properties from the manifest (properties not explicitly handled)
   * @param manifest The plugin manifest
   * @returns Object with custom properties
   * @private
   */
  private getCustomProperties(manifest: PluginManifest): Record<string, any> {
    const standardProps = [
      'name',
      'description',
      'author',
      'version',
      'fx_version',
      'games',
      'client_scripts',
      'server_scripts',
      'shared_scripts',
      'ui_page',
      'dependencies',
      'provide',
      'constraints',
      'files',
      'data_files',
      'is_map',
      'server_only',
      'loadscreen',
      'loadscreen_manual_shutdown',
      'exports',
      'server_exports',
      'config',
    ];

    const custom: Record<string, any> = {};

    for (const [key, value] of Object.entries(manifest)) {
      if (!standardProps.includes(key)) {
        custom[key] = value;
      }
    }

    return custom;
  }
}

export { BuildManager };
