import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import { builtinModules } from 'module';
import * as esbuild from 'esbuild';
import { spawn } from 'child_process';
import { minimatch } from 'minimatch';
import { FileManager } from './FileManager.js';
import { Plugin } from '../types/Plugin.js';
import { File } from '../types/File.js';
import { PluginManifest, ScriptList } from '../types/Manifest.js';
import { Logger, createLogger } from '../Logger.js';
import {
  PluginReloadManager,
  ReloadOptions,
  ReloadResult,
} from './PluginReloadManager.js';

type EntryPlatform = 'client' | 'server' | 'shared';

interface ScriptEntry {
  file: File;
  platform: EntryPlatform;
}

/**
 * Detect the legacy stub `Page.tsx` shape:
 *   export default function Page() { return <div></div>; }
 * Stubs trigger a full Vite cold-start that produces a webview with no
 * meaningful contents — about a third of the cold-build time on a 4-plugin
 * tree. When the page is structurally empty we emit a tiny placeholder
 * `index.html` instead.
 */
function isStubPageTsx(source: string): boolean {
  const collapsed = source.replace(/\s+/g, ' ').trim();
  return /^export\s+default\s+function\s+\w+\s*\(\s*\)\s*\{\s*return\s*<div>\s*<\/div>\s*;?\s*\}\s*;?\s*$/.test(
    collapsed
  );
}

/**
 * Externalize every Node built-in, both bare (`http`) and `node:`-prefixed
 * (`node:http`). Without the prefixed variant, `import 'node:fs'` falls
 * through esbuild's bundle path and ends up either failing at runtime or
 * being stubbed by esbuild's polyfill.
 */
const NODE_BUILTIN_EXTERNALS: string[] = [
  ...builtinModules,
  ...builtinModules.map((m) => `node:${m}`),
];

/**
 * Build manager
 * This class provides functionality to build plugins by copying files to a dist directory
 */
class BuildManager {
  private fileManager: FileManager;
  private distPath: string;
  private initialized: boolean = false;
  private logger: Logger;
  private production: boolean;

  /**
   * Creates a new BuildManager instance
   * @param fileManager The FileManager instance to use for file operations
   * @param distPath Optional path to the distribution directory
   * @param logger Logger instance; defaults to a console-backed logger if omitted
   * @param options.production If true, esbuild minifies and emits external
   *   sourcemaps for server bundles (client bundles never get sourcemaps);
   *   Vite is invoked with `--mode production`. Defaults to false.
   */
  constructor(
    fileManager: FileManager,
    distPath: string = 'dist',
    logger: Logger = createLogger({ prefix: 'BuildManager' }),
    options: { production?: boolean } = {}
  ) {
    this.fileManager = fileManager;
    this.distPath = path.resolve(distPath);
    this.logger = logger;
    this.production = options.production ?? false;
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
      this.logger.info('BuildManager initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize BuildManager', error);
      throw new Error('Failed to initialize BuildManager', { cause: error });
    }
  }

  private reloadManager: PluginReloadManager | null = null;

  /**
   * Initializes the reload manager
   * @param options Configuration options for the reload manager
   */
  async initializeReloadManager(options: ReloadOptions = {}): Promise<void> {
    // Construct the manager unconditionally and let it own the probe-retry
    // policy. Previous behavior nulled `reloadManager` on first-call failure,
    // which permanently disabled hot reload for the rest of the session even
    // if FXServer started later. The manager itself now retries on every
    // reload attempt via `ensureInitialized` (PR-06).
    this.reloadManager = new PluginReloadManager(options);
    const ok = await this.reloadManager.initialize();
    if (ok) {
      this.logger.info('✓ Reload manager initialized successfully');
    } else {
      this.logger.warn(
        '⚠ Reload manager probe failed; will retry on each reload attempt'
      );
    }
  }

  /**
   * Reloads a plugin after building
   * @param pluginNameOrPath The name or path of the plugin to reload
   * @returns The result of the reload operation
   */
  async reloadPlugin(pluginNameOrPath: string): Promise<ReloadResult> {
    if (!this.reloadManager) {
      return {
        success: false,
        message: 'Reload manager not initialized',
      };
    }

    try {
      // Get the plugin
      const plugin = this.getPluginFromNameOrPath(pluginNameOrPath);

      if (!plugin) {
        throw new Error(`Plugin not found: ${pluginNameOrPath}`);
      }

      // Reload the plugin
      const result = await this.reloadManager.reloadPlugin(plugin);

      if (result.success) {
        this.logger.info(`✓ Plugin ${plugin.pluginName} reloaded successfully`);
      } else {
        this.logger.warn(
          `⚠ Plugin ${plugin.pluginName} reload failed: ${result.message}`
        );
      }

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Error reloading plugin ${pluginNameOrPath}:`, error);

      return {
        success: false,
        message: `Failed to reload plugin ${pluginNameOrPath}: ${errorMessage}`,
      };
    }
  }

  /**
   * Builds a plugin transactionally: stages all output into
   * `<destDir>.tmp.<pid>`, then atomically swaps it into `<destDir>` only
   * after every step succeeds. On any failure the temp dir is removed and the
   * existing `<destDir>` is left untouched, so partially-built outputs never
   * become visible to FXServer.
   *
   * Note (Windows): `fs.rm` of the existing `<destDir>` can fail with
   * EBUSY/EPERM if FXServer holds an open handle. In that case the temp dir
   * remains on disk and can be recovered by `sweepOrphans()` on the next
   * build with `--no-clean` (or by a fresh `--clean` rebuild). Coordinating
   * with FXServer's resource scan is out of scope for this PR.
   *
   * @param pluginNameOrPath The name or path of the plugin to build
   * @param reload Whether to trigger a hot reload after the build
   * @param options.skipVite If true, copy the existing dist `html/` dir
   *   into the temp dir instead of running Vite. Used by the watcher's
   *   file-kind routing so a TS-only edit doesn't pay the Vite cold start.
   */
  async buildPlugin(
    pluginNameOrPath: string,
    reload: boolean = false,
    options: { skipVite?: boolean } = {}
  ): Promise<void> {
    this.ensureInitialized();

    let tmpDir: string | undefined;

    try {
      const plugin = this.getPluginFromNameOrPath(pluginNameOrPath);
      if (!plugin) {
        throw new Error(`Plugin not found: ${pluginNameOrPath}`);
      }

      if (plugin.manifestError) {
        throw new Error(
          `Cannot build plugin ${plugin.pluginName}: ${plugin.manifestError}`
        );
      }
      if (!plugin.manifest) {
        throw new Error(
          `Cannot build plugin ${plugin.pluginName}: plugin.json is missing or unreadable`
        );
      }

      this.logger.info(`Building plugin: ${plugin.pluginName}`);

      const destDir = this.getPluginDestDir(plugin);
      tmpDir = `${destDir}.tmp.${process.pid}`;

      if (fsSync.existsSync(tmpDir)) {
        await fs.rm(tmpDir, { recursive: true, force: true });
      }
      await fs.mkdir(path.dirname(destDir), { recursive: true });
      await fs.mkdir(tmpDir, { recursive: true });

      // File-kind routing fast path: when the watcher knows nothing under
      // `html/` changed, copy the previous Vite output into the temp dir
      // and skip the bundler. Falls back to a full Vite build if the
      // previous output isn't on disk (first build, or a prior failure
      // wiped it).
      const existingHtmlDir = path.join(destDir, 'html');
      if (options.skipVite && fsSync.existsSync(existingHtmlDir)) {
        const tmpHtmlDir = path.join(tmpDir, 'html');
        await fs.cp(existingHtmlDir, tmpHtmlDir, { recursive: true });
        this.logger.info(
          `Skipped Vite for ${plugin.pluginName}: copied previous html/ dist forward`
        );
      } else {
        await this.buildPluginPageTsx(plugin, tmpDir);
      }

      await Promise.all([
        this.buildPluginLua(plugin, tmpDir),
        this.buildPluginJson(plugin, tmpDir),
        this.buildPluginTs(plugin, tmpDir),
        this.buildPluginJs(plugin, tmpDir),
        this.buildPluginManifest(plugin, tmpDir),
        this.buildPluginOtherFiles(plugin, tmpDir),
      ]);

      if (fsSync.existsSync(destDir)) {
        await fs.rm(destDir, { recursive: true, force: true });
      }
      await fs.rename(tmpDir, destDir);
      tmpDir = undefined;

      this.logger.info(
        `✓ Plugin ${
          plugin.pluginName
        } built successfully to ${this.pathToDisplay(destDir)}`
      );
    } catch (error) {
      this.logger.error(`Error building plugin ${pluginNameOrPath}`, error);
      if (tmpDir) {
        try {
          await fs.rm(tmpDir, { recursive: true, force: true });
        } catch (cleanupError) {
          this.logger.warn(
            `⚠ Failed to clean up temp build dir ${tmpDir}`,
            cleanupError
          );
        }
      }
      throw new Error(`Failed to build plugin ${pluginNameOrPath}`, {
        cause: error,
      });
    }

    // After successful build, reload if requested
    if (reload && this.reloadManager) {
      try {
        await this.reloadPlugin(pluginNameOrPath);
      } catch (reloadError) {
        this.logger.warn(
          `⚠ Plugin built successfully but reload failed: ${reloadError}`
        );
      }
    }
  }

  /**
   * Builds Lua files for a plugin
   * @param pluginNameOrPath The name or path of the plugin, or the Plugin object
   * @param outputDir Override the destination directory (used by transactional buildPlugin to stage into a temp dir)
   */
  async buildPluginLua(
    pluginNameOrPath: string | Plugin,
    outputDir?: string
  ): Promise<void> {
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
        this.logger.info(`No Lua files found in plugin ${plugin.pluginName}`);
        return;
      }

      await this.copyFilesToDist(plugin, luaFiles, outputDir);
      this.logger.info(
        `✓ Built ${luaFiles.length} Lua file(s) for plugin ${plugin.pluginName}`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (typeof pluginNameOrPath === 'string') {
        this.logger.error(
          `Error building Lua files for plugin ${pluginNameOrPath}:`,
          error
        );
        throw new Error(
          `Failed to build Lua files for plugin ${pluginNameOrPath}: ${errorMessage}`
        );
      } else {
        this.logger.error(
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
   * @param outputDir Override the destination directory (used by transactional buildPlugin to stage into a temp dir)
   */
  async buildPluginJson(
    pluginNameOrPath: string | Plugin,
    outputDir?: string
  ): Promise<void> {
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
      const jsonFiles = plugin.files.filter(
        (file) =>
          file.fileName.endsWith('.json') && file.fileName !== 'plugin.json'
      );

      if (jsonFiles.length === 0) {
        this.logger.info(`No JSON files found in plugin ${plugin.pluginName}`);
        return;
      }

      await this.copyFilesToDist(plugin, jsonFiles, outputDir);
      this.logger.info(
        `✓ Built ${jsonFiles.length} JSON file(s) for plugin ${plugin.pluginName}`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (typeof pluginNameOrPath === 'string') {
        this.logger.error(
          `Error building JSON files for plugin ${pluginNameOrPath}:`,
          error
        );
        throw new Error(
          `Failed to build JSON files for plugin ${pluginNameOrPath}: ${errorMessage}`
        );
      } else {
        this.logger.error(
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
   * @param outputDir Override the destination directory (used by transactional buildPlugin to stage into a temp dir)
   */
  async buildPluginTs(
    pluginNameOrPath: string | Plugin,
    outputDir?: string
  ): Promise<void> {
    this.ensureInitialized();

    try {
      const plugin =
        typeof pluginNameOrPath === 'string'
          ? this.getPluginFromNameOrPath(pluginNameOrPath)
          : pluginNameOrPath;

      if (!plugin) {
        throw new Error(`Plugin not found: ${pluginNameOrPath}`);
      }

      // Manifest-driven entries: only files explicitly declared in
      // `client_scripts`/`server_scripts`/`shared_scripts` become bundles.
      // The previous tree-walked behavior also emitted shared/, html/,
      // and any stray .ts file as standalone IIFEs (~31 MB of dead disk
      // for character-create alone).
      const tsEntries = this.getScriptEntries(plugin).filter(
        (e) =>
          e.file.fileName.endsWith('.ts') && !e.file.fileName.endsWith('.tsx')
      );

      if (tsEntries.length === 0) {
        this.logger.info(`No TypeScript files found in plugin ${plugin.pluginName}`);
        return;
      }

      const destDir = outputDir ?? this.getPluginDestDir(plugin);

      // Process each TypeScript entry
      for (const entry of tsEntries) {
        const file = entry.file;
        // Get the relative path within the plugin
        const relativePath = path.relative(plugin.fullPath, file.fullPath);

        // Change the extension from .ts to .js for the output file
        const outputRelativePath = relativePath.replace(/\.ts$/, '.js');
        const outputPath = path.join(destDir, outputRelativePath);

        // Create the destination directory if it doesn't exist
        const outputDir = path.dirname(outputPath);
        await fs.mkdir(outputDir, { recursive: true });

        // Server vs. client now flows from the manifest entry, not from a
        // path-substring sniff. `shared_scripts` runs on whichever side
        // requires it; FiveM treats it as both, so we bundle for browser
        // (matches the previous default for `shared/`).
        const isServerScript = entry.platform === 'server';
        const externalPackages = this.getExternalPackages(isServerScript);

        // Configure loader based on file type
        const loader: Record<string, esbuild.Loader> = {
          '.ts': 'ts',
          '.js': 'js',
        };

        this.logger.info(`Bundling TypeScript file: ${relativePath}`);

        try {
          // Bundle the file
          const result = await esbuild.build({
            entryPoints: [file.fullPath],
            bundle: true,
            outfile: outputPath,
            format: 'iife', // Use IIFE format for FiveM compatibility
            target: 'es2017',
            // Production builds minify everything. Dev builds stay readable
            // so the watch-loop console traces are debuggable.
            minify: this.production,
            // Sourcemaps:
            //   - Client bundles: never. They're downloaded by every player
            //     who connects, and `sourcesContent` would leak full TS.
            //   - Server bundles: external `.map` siblings in production
            //     (smaller IIFE shipped to FXServer, .map kept on disk for
            //     debugging) and inline in dev (single-file convenience).
            //   - The `.map` filename doesn't match `client/*.js` /
            //     `server/*.js` manifest globs, so it's never listed in
            //     `client_scripts` and never shipped over the wire.
            sourcemap: isServerScript
              ? this.production
                ? 'external'
                : 'inline'
              : false,
            loader,
            logLevel: 'info',
            external: externalPackages.concat(isServerScript ? ['canvas'] : []), // Add canvas as external for server scripts
            // Use node platform for server scripts, browser platform for client scripts
            platform: isServerScript ? 'node' : 'browser',
          });

          // Check for errors
          if (result.errors.length > 0) {
            const formatted = await this.logger.formatEsbuildErrors(
              result.errors
            );
            this.logger.error(
              `Errors bundling ${file.fullPath}:\n${formatted.join('\n')}`
            );
            throw new Error(`Failed to bundle ${file.fullPath}`, {
              cause: result.errors[0],
            });
          }

          // Verify the file was created
          if (!fsSync.existsSync(outputPath)) {
            throw new Error(
              `Failed to verify file exists after bundling: ${outputPath}`
            );
          }
        } catch (bundleError) {
          this.logger.error(
            `Error bundling TypeScript file ${file.fullPath}`,
            bundleError
          );
          throw bundleError;
        }
      }

      this.logger.info(
        `✓ Built ${tsEntries.length} TypeScript file(s) for plugin ${plugin.pluginName}`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (typeof pluginNameOrPath === 'string') {
        this.logger.error(
          `Error building TypeScript files for plugin ${pluginNameOrPath}:`,
          error
        );
        throw new Error(
          `Failed to build TypeScript files for plugin ${pluginNameOrPath}: ${errorMessage}`
        );
      } else {
        this.logger.error(
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
   * @param outputDir Override the destination directory (used by transactional buildPlugin to stage into a temp dir)
   */
  async buildPluginJs(
    pluginNameOrPath: string | Plugin,
    outputDir?: string
  ): Promise<void> {
    this.ensureInitialized();

    try {
      const plugin =
        typeof pluginNameOrPath === 'string'
          ? this.getPluginFromNameOrPath(pluginNameOrPath)
          : pluginNameOrPath;

      if (!plugin) {
        throw new Error(`Plugin not found: ${pluginNameOrPath}`);
      }

      // Manifest-driven entries: only declared JS files become bundles.
      const jsEntries = this.getScriptEntries(plugin).filter(
        (e) =>
          e.file.fileName.endsWith('.js') && !e.file.fileName.endsWith('.jsx')
      );

      if (jsEntries.length === 0) {
        this.logger.info(`No JavaScript files found in plugin ${plugin.pluginName}`);
        return;
      }

      const destDir = outputDir ?? this.getPluginDestDir(plugin);

      // Process each JavaScript entry
      for (const entry of jsEntries) {
        const file = entry.file;
        // Get the relative path within the plugin
        const relativePath = path.relative(plugin.fullPath, file.fullPath);
        const outputPath = path.join(destDir, relativePath);

        // Create the destination directory if it doesn't exist
        const outputDir = path.dirname(outputPath);
        await fs.mkdir(outputDir, { recursive: true });

        const isServerScript = entry.platform === 'server';
        const externalPackages = this.getExternalPackages(isServerScript);

        this.logger.info(`Bundling JavaScript file: ${relativePath}`);

        try {
          // Bundle the file
          const result = await esbuild.build({
            entryPoints: [file.fullPath],
            bundle: true,
            outfile: outputPath,
            format: 'iife', // Use IIFE format for FiveM compatibility
            target: 'es2017',
            minify: this.production,
            // See sourcemap rationale in `buildPluginTs`. JS-source plugins
            // share the same client/server distinction.
            sourcemap: isServerScript
              ? this.production
                ? 'external'
                : 'inline'
              : false,
            external: externalPackages,
            // Use node platform for server scripts, browser platform for client scripts
            platform: isServerScript ? 'node' : 'browser',
          });

          // Check for errors
          if (result.errors.length > 0) {
            const formatted = await this.logger.formatEsbuildErrors(
              result.errors
            );
            this.logger.error(
              `Errors bundling ${file.fullPath}:\n${formatted.join('\n')}`
            );
            throw new Error(`Failed to bundle ${file.fullPath}`, {
              cause: result.errors[0],
            });
          }

          // Verify the file was created
          if (!fsSync.existsSync(outputPath)) {
            throw new Error(
              `Failed to verify file exists after bundling: ${outputPath}`
            );
          }
        } catch (bundleError) {
          this.logger.error(
            `Error bundling JavaScript file ${file.fullPath}`,
            bundleError
          );
          throw bundleError;
        }
      }

      this.logger.info(
        `✓ Built ${jsEntries.length} JavaScript file(s) for plugin ${plugin.pluginName}`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (typeof pluginNameOrPath === 'string') {
        this.logger.error(
          `Error building JavaScript files for plugin ${pluginNameOrPath}:`,
          error
        );
        throw new Error(
          `Failed to build JavaScript files for plugin ${pluginNameOrPath}: ${errorMessage}`
        );
      } else {
        this.logger.error(
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
   * Builds the per-plugin webview by handing the plugin's Page.tsx to Vite via
   * the `virtual:plugin-page` module (resolved in vite.config.ts from
   * `U_CORE_PLUGIN_PAGE`). No mutation of `src/webview/App.tsx` — that file is
   * gone; cross-plugin builds are now safe to run in parallel.
   */
  async buildPluginPageTsx(
    pluginNameOrPath: string | Plugin,
    outputDir?: string
  ): Promise<void> {
    this.ensureInitialized();

    try {
      const plugin =
        typeof pluginNameOrPath === 'string'
          ? this.getPluginFromNameOrPath(pluginNameOrPath)
          : pluginNameOrPath;

      if (!plugin) {
        throw new Error(`Plugin not found: ${pluginNameOrPath}`);
      }

      const pageTsxFile = plugin.files.find(
        (file) =>
          file.fileName === 'Page.tsx' &&
          (file.fullPath.includes('/html/') ||
            file.fullPath.includes('\\html\\'))
      );

      if (!pageTsxFile) {
        this.logger.info(`No Page.tsx file found in plugin ${plugin.pluginName}`);
        return;
      }

      this.logger.info(
        `Building webview for plugin ${plugin.pluginName} from ${pageTsxFile.displayPath}`
      );

      const pluginDistDir = outputDir ?? this.getPluginDestDir(plugin);
      const htmlOutputDir = path.join(pluginDistDir, 'html');
      await fs.mkdir(htmlOutputDir, { recursive: true });

      // Skip the Vite cold-start when the page is a structural stub
      // (`<div></div>`). Two of the four shipped plugins were stubs and
      // each cost ~3s to compile a webview that rendered nothing.
      const pageSource = await fs.readFile(pageTsxFile.fullPath, 'utf-8');
      if (isStubPageTsx(pageSource)) {
        this.logger.info(
          `Stub Page.tsx detected for ${plugin.pluginName}; skipping Vite and emitting placeholder index.html`
        );
        const indexHtmlPath = path.join(htmlOutputDir, 'index.html');
        await fs.writeFile(
          indexHtmlPath,
          '<!doctype html><html><head><meta charset="utf-8"><title>' +
            plugin.pluginName +
            '</title></head><body><div id="root"></div></body></html>\n'
        );
        this.logger.info(
          `✓ Built webview placeholder for plugin ${plugin.pluginName} to ${this.pathToDisplay(htmlOutputDir)}`
        );
        return;
      }

      await this.runViteBuild(htmlOutputDir, pageTsxFile.fullPath);

      const indexHtmlPath = path.join(htmlOutputDir, 'index.html');
      if (!fsSync.existsSync(indexHtmlPath)) {
        throw new Error(
          `Failed to generate index.html for plugin ${plugin.pluginName}`
        );
      }

      this.logger.info(
        `✓ Built webview for plugin ${plugin.pluginName} to ${this.pathToDisplay(htmlOutputDir)}`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const pluginName =
        typeof pluginNameOrPath === 'string'
          ? pluginNameOrPath
          : pluginNameOrPath.pluginName;

      this.logger.error(`Error building webview for plugin ${pluginName}:`, error);
      throw new Error(
        `Failed to build webview for plugin ${pluginName}: ${errorMessage}`
      );
    }
  }

  /**
   * Runs `vite build` against the per-plugin Page.tsx. The page path is passed
   * via `U_CORE_PLUGIN_PAGE`; vite.config.ts's `virtual:plugin-page` plugin
   * resolves the import in src/webview/main.tsx to that file.
   */
  private async runViteBuild(
    outputDir: string,
    pluginPagePath: string
  ): Promise<void> {
    // `vite build` defaults to production mode (always minifies), but
    // pass `--mode` explicitly so .env.production loading + downstream
    // plugins see the right `import.meta.env.MODE`.
    const mode = this.production ? 'production' : 'development';
    const buildCommand = `npx vite build --mode=${mode} --outDir=${outputDir}`;
    this.logger.info(`Executing: ${buildCommand} (page=${pluginPagePath})`);

    const child = spawn(buildCommand, {
      cwd: process.cwd(),
      shell: true,
      stdio: 'inherit',
      env: {
        ...process.env,
        U_CORE_PLUGIN_PAGE: pluginPagePath,
        NODE_ENV: this.production ? 'production' : 'development',
      },
    });

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
   * Copies files to the dist directory
   * @param plugin The plugin object
   * @param files The files to copy
   * @param outputDir Override the destination directory (used by transactional buildPlugin to stage into a temp dir)
   * @private
   */
  private async copyFilesToDist(
    plugin: Plugin,
    files: File[],
    outputDir?: string
  ): Promise<void> {
    const destDir = outputDir ?? this.getPluginDestDir(plugin);

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
  async buildAllPlugins(reload: boolean = false): Promise<void> {
    this.ensureInitialized();

    try {
      const plugins = this.fileManager.getAllPlugins();

      if (plugins.length === 0) {
        this.logger.info('No plugins found to build');
        return;
      }

      this.logger.info(`Building all ${plugins.length} plugins...`);

      // Per-plugin Vite entries (PR-09) make cross-plugin webview builds
      // independent — App.tsx is no longer mutated, so parallel `vite build`
      // invocations cannot clobber each other.
      await Promise.all(
        plugins.map((plugin) => this.buildPlugin(plugin.fullPath))
      );

      this.logger.info(`✓ All ${plugins.length} plugins built successfully`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('Error building all plugins:', error);
      throw new Error(`Failed to build all plugins: ${errorMessage}`);
    }

    // After all plugins are built, reload them if requested
    if (reload && this.reloadManager) {
      try {
        this.logger.info('\n🔄 Reloading all resources...');
        const result = await this.reloadManager.reloadAllResources();

        if (result.success) {
          this.logger.info('✓ All resources reloaded successfully');
        } else {
          this.logger.warn('⚠ Some resources failed to reload');

          // Log failed resources
          if (result.results) {
            const failedResources = Object.entries(result.results)
              .filter(([_, success]) => !success)
              .map(([name]) => name);

            if (failedResources.length > 0) {
              this.logger.warn('Failed resources:', failedResources.join(', '));
            }
          }
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.warn(`⚠ Error reloading resources: ${errorMessage}`);
      }
    }
  }

  /**
   * Sweeps orphaned outputs from the dist tree.
   *
   * Removes:
   * - Any directory that contains an `fxmanifest.lua` but is no longer the
   *   destination of an active plugin (renamed/deleted/moved source plugin).
   * - Any directory whose name matches `<basename>.tmp.<digits>` — these are
   *   leftover staging dirs from a build process that crashed or is still
   *   running. We delete them indiscriminately because they only exist as
   *   transient build state; an in-flight build that races with the sweep
   *   will simply rebuild its own tmp dir.
   * - Empty wrapper directories left behind after either of the above.
   *
   * Intended to run when `--no-clean` is set, since that path otherwise lets
   * stale outputs accumulate forever (R-34). With `--clean` the entire dist
   * is wiped first, so this sweep is unnecessary.
   */
  async sweepOrphans(): Promise<void> {
    this.ensureInitialized();

    if (!fsSync.existsSync(this.distPath)) {
      return;
    }

    const activePlugins = this.fileManager.getAllPlugins();
    const expectedDirs = new Set<string>(
      activePlugins.map((plugin) =>
        path.normalize(this.getPluginDestDir(plugin))
      )
    );

    let orphansRemoved = 0;
    let tmpDirsRemoved = 0;

    const sweep = async (dir: string): Promise<void> => {
      let entries: fsSync.Dirent[];
      try {
        entries = await fs.readdir(dir, { withFileTypes: true });
      } catch (error) {
        // Dir disappeared mid-sweep — nothing to do.
        return;
      }

      const baseName = path.basename(dir);
      const isTmpDir = /\.tmp\.\d+$/.test(baseName);
      if (isTmpDir) {
        await fs.rm(dir, { recursive: true, force: true });
        tmpDirsRemoved++;
        return;
      }

      const containsManifest = entries.some(
        (e) => e.isFile() && e.name === 'fxmanifest.lua'
      );
      if (containsManifest && !expectedDirs.has(path.normalize(dir))) {
        await fs.rm(dir, { recursive: true, force: true });
        orphansRemoved++;
        return;
      }

      for (const entry of entries) {
        if (entry.isDirectory()) {
          await sweep(path.join(dir, entry.name));
        }
      }

      // Prune empty wrapper directories (e.g. `[character]/[auth]/` after the
      // last plugin under it was removed). Never prune the dist root itself.
      if (dir !== this.distPath) {
        try {
          const remaining = await fs.readdir(dir);
          if (remaining.length === 0) {
            await fs.rmdir(dir);
          }
        } catch {
          // Race with another process; ignore.
        }
      }
    };

    await sweep(this.distPath);

    if (orphansRemoved > 0 || tmpDirsRemoved > 0) {
      console.log(
        `✓ Orphan sweep: removed ${orphansRemoved} stale plugin output(s)` +
          (tmpDirsRemoved > 0
            ? ` and ${tmpDirsRemoved} leftover temp dir(s)`
            : '')
      );
    }
  }

  /**
   * Cleans the dist directory
   */
  async clean(): Promise<void> {
    this.ensureInitialized();

    try {
      this.logger.info(
        `Cleaning dist directory: ${this.pathToDisplay(this.distPath)}`
      );

      // Check if the directory exists
      if (fsSync.existsSync(this.distPath)) {
        // Remove all files and subdirectories
        await fs.rm(this.distPath, { recursive: true, force: true });

        // Recreate the empty directory
        await fs.mkdir(this.distPath, { recursive: true });
      }

      this.logger.info('✓ Dist directory cleaned successfully');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('Error cleaning dist directory:', error);
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
  /**
   * Path-segment platform classifier. Returns the platform name when the
   * file's immediate parent under the plugin root is one of `server`,
   * `client`, or `shared`. Used as a fallback when a script entry sits
   * outside the manifest globs (currently unused — manifest-driven
   * bundling is the source of truth — but kept available for future
   * tooling that needs to ask "is this a server file?").
   *
   * Replaces the previous substring sniff that matched any `/server/`
   * anywhere in the path, which misclassified files like
   * `client/server-utils/foo.ts` as server-platform bundles.
   */
  private getPathSegmentPlatform(
    pluginRoot: string,
    filePath: string
  ): EntryPlatform | null {
    const rel = path.relative(pluginRoot, filePath).replace(/\\/g, '/');
    const segments = rel.split('/').filter(Boolean);
    const head = segments[0];
    if (head === 'server' || head === 'client' || head === 'shared') {
      return head;
    }
    return null;
  }

  /**
   * Derive script entries from the plugin's manifest globs. A source file
   * (.ts or .js) becomes an entry only if its post-build `.js` path matches
   * one of `client_scripts`/`server_scripts`/`shared_scripts`. Files that
   * match no glob (e.g. `shared/types.ts`) are imported via the entry
   * graph but never emitted as standalone IIFEs.
   * @private
   */
  private getScriptEntries(plugin: Plugin): ScriptEntry[] {
    const manifest = plugin.manifest;
    if (!manifest) return [];

    const toGlobs = (s: ScriptList | undefined): string[] =>
      s === undefined ? [] : Array.isArray(s) ? s : [s];

    const serverGlobs = toGlobs(manifest.server_scripts);
    const clientGlobs = toGlobs(manifest.client_scripts);
    const sharedGlobs = toGlobs(manifest.shared_scripts);

    const entries: ScriptEntry[] = [];
    const seen = new Set<string>();

    for (const file of plugin.files) {
      const fn = file.fileName;
      const isCandidate =
        (fn.endsWith('.ts') && !fn.endsWith('.tsx')) ||
        (fn.endsWith('.js') && !fn.endsWith('.jsx'));
      if (!isCandidate) continue;
      if (seen.has(file.fullPath)) continue;

      const rel = path.relative(plugin.fullPath, file.fullPath).replace(/\\/g, '/');
      // Manifest globs target the post-build `.js` path, so map .ts → .js
      // for matching. The source file's actual extension is preserved when
      // bundling; this is just to compare against the manifest pattern.
      const outputJs = rel.replace(/\.ts$/, '.js');
      const matches = (globs: string[]) =>
        globs.some((g) => minimatch(outputJs, g));

      let platform: EntryPlatform | null = null;
      if (matches(serverGlobs)) platform = 'server';
      else if (matches(clientGlobs)) platform = 'client';
      else if (matches(sharedGlobs)) platform = 'shared';

      if (platform) {
        entries.push({ file, platform });
        seen.add(file.fullPath);
      }
    }

    return entries;
  }

  /**
   * Gets the list of packages to not inline
   * @param isServerScript Whether the file is a server-side script
   * @returns List of external packages
   * @private
   */
  private getExternalPackages(isServerScript: boolean): string[] {
    // For server scripts, externalize every Node built-in (both bare and
    // `node:`-prefixed). The previous hand-rolled list missed `node:`
    // imports, so `import 'node:fs'` was bundled into client/server JS
    // and either crashed or silently stubbed at runtime.
    return isServerScript ? [...NODE_BUILTIN_EXTERNALS] : [];
  }

  /**
   * Builds an fxmanifest.lua file from a plugin.json file
   * @param pluginNameOrPath The name or path of the plugin, or the Plugin object
   * @param outputDir Override the destination directory (used by transactional buildPlugin to stage into a temp dir)
   */
  async buildPluginManifest(
    pluginNameOrPath: string | Plugin,
    outputDir?: string
  ): Promise<void> {
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
        this.logger.warn(
          `No manifest found for plugin ${plugin.pluginName}, skipping fxmanifest.lua generation`
        );
        return;
      }

      // Generate the fxmanifest.lua content
      const manifestContent = this.generateFxManifest(plugin);

      // Get the destination directory for the plugin
      const destDir = outputDir ?? this.getPluginDestDir(plugin);

      // Ensure the destination directory exists
      await fs.mkdir(destDir, { recursive: true });

      // Write the fxmanifest.lua file
      const manifestPath = path.join(destDir, 'fxmanifest.lua');
      await fs.writeFile(manifestPath, manifestContent, 'utf-8');

      this.logger.info(`✓ Generated fxmanifest.lua for plugin ${plugin.pluginName}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (typeof pluginNameOrPath === 'string') {
        this.logger.error(
          `Error building manifest for plugin ${pluginNameOrPath}:`,
          error
        );
        throw new Error(
          `Failed to build manifest for plugin ${pluginNameOrPath}: ${errorMessage}`
        );
      } else {
        this.logger.error(
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

    // Resource name (`name` is part of the schema; FXServer accepts it).
    if (manifest.name) {
      content += `name '${this.escapeLuaString(manifest.name)}'\n`;
    }

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

    // Honor `config` from plugin.json: emit each entry as a `set` directive
    // so FXServer-side convars are available without a separate convars block.
    if (manifest.config && Object.keys(manifest.config).length > 0) {
      content += `\n-- Config\n`;
      for (const [rawKey, value] of Object.entries(manifest.config)) {
        const key = this.assertSafeManifestKey(rawKey, plugin.pluginName);
        content += `set '${key}' ${this.formatLuaScalar(value, key, plugin.pluginName)}\n`;
      }
    }

    // Add any custom properties (anything not in the standardProps allowlist)
    const customProps = this.getCustomProperties(manifest);
    if (Object.keys(customProps).length > 0) {
      content += `\n-- Additional Metadata\n`;
      for (const [rawKey, value] of Object.entries(customProps)) {
        const key = this.assertSafeManifestKey(rawKey, plugin.pluginName);
        if (Array.isArray(value)) {
          for (const val of value) {
            content += `${key} ${this.formatLuaScalar(val, key, plugin.pluginName)}\n`;
          }
        } else {
          content += `${key} ${this.formatLuaScalar(value, key, plugin.pluginName)}\n`;
        }
      }
    }

    return content;
  }

  /**
   * Custom-property keys must be valid Lua identifiers (FXServer parses these
   * as bareword directives). Reject anything that would produce a syntax error
   * in the generated fxmanifest.lua.
   */
  private assertSafeManifestKey(key: string, pluginName: string): string {
    if (!/^[a-z_][a-z0-9_]*$/i.test(key)) {
      throw new Error(
        `Invalid plugin.json key for plugin ${pluginName}: '${key}' must match /^[a-z_][a-z0-9_]*$/i`
      );
    }
    return key;
  }

  /**
   * Type-aware emission for fxmanifest scalars:
   *  - boolean -> 'yes' | 'no' (FXServer convention)
   *  - number  -> unquoted Lua number
   *  - string  -> single-quoted, escaped
   *  - object  -> hard error (silently stringifying produces a useless directive)
   */
  private formatLuaScalar(
    value: unknown,
    keyForError: string,
    pluginName: string
  ): string {
    if (typeof value === 'boolean') {
      return `'${value ? 'yes' : 'no'}'`;
    }
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) {
        throw new Error(
          `Invalid numeric value for ${keyForError} in plugin ${pluginName}: ${value}`
        );
      }
      return String(value);
    }
    if (typeof value === 'string') {
      return `'${this.escapeLuaString(value)}'`;
    }
    if (value === null || typeof value === 'undefined') {
      throw new Error(
        `Null/undefined value for ${keyForError} in plugin ${pluginName} cannot be emitted to fxmanifest.lua`
      );
    }
    // Objects (and any other non-scalar) are not representable as a single
    // Lua directive; refuse rather than emit a useless stringified value.
    throw new Error(
      `Object value for ${keyForError} in plugin ${pluginName} is not supported in fxmanifest.lua emission`
    );
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

  /**
   * Builds other files for a plugin by copying untreated extensions to the output folder
   * @param pluginNameOrPath The name or path of the plugin, or the Plugin object
   * @param outputDir Override the destination directory (used by transactional buildPlugin to stage into a temp dir)
   */
  async buildPluginOtherFiles(
    pluginNameOrPath: string | Plugin,
    outputDir?: string
  ): Promise<void> {
    this.ensureInitialized();

    try {
      const plugin =
        typeof pluginNameOrPath === 'string'
          ? this.getPluginFromNameOrPath(pluginNameOrPath)
          : pluginNameOrPath;

      if (!plugin) {
        throw new Error(`Plugin not found: ${pluginNameOrPath}`);
      }

      // Define the extensions that are already handled by other methods
      const handledExtensions = ['.lua', '.json', '.ts', '.js', '.tsx', '.jsx'];

      // Filter files that don't have handled extensions
      const otherFiles = plugin.files.filter(
        (file) => !handledExtensions.some((ext) => file.fileName.endsWith(ext))
      );

      for (const file of otherFiles) {
        this.logger.info(`Copying other file: ${file.fileName}`);
      }

      if (otherFiles.length === 0) {
        this.logger.info(`No other files found in plugin ${plugin.pluginName}`);
        return;
      }

      // Log the types of files being copied
      const extensionCounts = new Map<string, number>();
      for (const file of otherFiles) {
        const ext = path.extname(file.fileName).toLowerCase();
        extensionCounts.set(ext, (extensionCounts.get(ext) || 0) + 1);
      }

      const extensionSummary = Array.from(extensionCounts.entries())
        .map(([ext, count]) => `${count} ${ext || '(no extension)'} file(s)`)
        .join(', ');

      this.logger.info(
        `Copying other files for plugin ${plugin.pluginName}: ${extensionSummary}`
      );

      await this.copyFilesToDist(plugin, otherFiles, outputDir);
      this.logger.info(
        `✓ Built ${otherFiles.length} other file(s) for plugin ${plugin.pluginName}`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (typeof pluginNameOrPath === 'string') {
        this.logger.error(
          `Error building other files for plugin ${pluginNameOrPath}:`,
          error
        );
        throw new Error(
          `Failed to build other files for plugin ${pluginNameOrPath}: ${errorMessage}`
        );
      } else {
        this.logger.error(
          `Error building other files for plugin ${pluginNameOrPath.pluginName}:`,
          error
        );
        throw new Error(
          `Failed to build other files for plugin ${pluginNameOrPath.pluginName}: ${errorMessage}`
        );
      }
    }
  }
}

export { BuildManager };
