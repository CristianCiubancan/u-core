/**
 * Core types for the build system
 */

/**
 * Build context containing all information needed for the build
 */
export interface BuildContext {
  /** Root directory of the project */
  rootDir: string;
  /** Directory containing plugins */
  pluginsDir: string;
  /** Directory containing core plugins */
  coreDir: string;
  /** Output directory for built files */
  distDir: string;
  /** Whether to watch for changes */
  watch: boolean;
  /** Whether to enable resource reloading */
  reload: boolean;
  /** Logger instance */
  logger: Logger;
  /** Configuration */
  config: BuildConfig;
}

/**
 * Build configuration
 */
export interface BuildConfig {
  /** Environment variables */
  env: Record<string, string>;
  /** Build options */
  options: {
    /** Whether to minify output */
    minify: boolean;
    /** Whether to generate source maps */
    sourceMaps: boolean;
    /** Whether to clean the output directory before building */
    clean: boolean;
  };
  /** Paths configuration */
  paths: {
    /** Root directory of the project */
    rootDir: string;
    /** Directory containing plugins */
    pluginsDir: string;
    /** Directory containing core plugins */
    coreDir: string;
    /** Output directory for built files */
    distDir: string;
    /** Directory for webview assets */
    webviewDir: string;
  };
  /** Resource reloader configuration */
  reloader: {
    /** Whether to enable resource reloading */
    enabled: boolean;
    /** Host for resource reloading */
    host: string;
    /** Port for resource reloading */
    port: number;
    /** API key for resource reloading */
    apiKey: string;
  };
}

/**
 * Plugin information
 */
export interface Plugin {
  /** Name of the plugin */
  name: string;
  /** Path from plugins directory */
  pathFromPluginsDir: string;
  /** Whether the plugin has HTML content */
  hasHtml: boolean;
  /** Full path to the plugin directory */
  fullPath?: string;
  /** Files in the plugin */
  files: PluginFile[];
}

/**
 * File information
 */
export interface PluginFile {
  /** Name of the file */
  name: string;
  /** Path from plugin directory */
  pathFromPluginDir: string;
  /** Whether the file is plugin.json */
  isPluginJsonFile: boolean;
  /** Full path to the file */
  fullPath: string;
}

/**
 * File category
 */
export enum FileCategory {
  Client = 'client',
  Server = 'server',
  Shared = 'shared',
  Other = 'other',
}

/**
 * Processed file information
 */
export interface ProcessedFile {
  /** Source path relative to plugin directory */
  sourcePath: string;
  /** Output path relative to output directory */
  outputPath: string;
  /** Category of the file */
  category: FileCategory;
}

/**
 * Logger interface
 */
export interface Logger {
  /** Log a debug message */
  debug(message: string, ...args: any[]): void;
  /** Log an info message */
  info(message: string, ...args: any[]): void;
  /** Log a warning message */
  warn(message: string, ...args: any[]): void;
  /** Log an error message */
  error(message: string, ...args: any[]): void;
}

/**
 * Command interface for CLI commands
 */
export interface Command {
  /** Name of the command */
  name: string;
  /** Description of the command */
  description: string;
  /** Execute the command */
  execute(args: string[]): Promise<void>;
}

/**
 * Bundler interface for bundling files
 */
export interface Bundler {
  /** Bundle a file */
  bundle(inputFile: string, outputFile: string, options?: any): Promise<void>;
}

/**
 * File system interface
 */
export interface FileSystem {
  /** Read a file */
  readFile(path: string, encoding?: string): Promise<string>;
  /** Write a file */
  writeFile(path: string, content: string): Promise<void>;
  /** Copy a file */
  copyFile(source: string, destination: string): Promise<void>;
  /** Ensure a directory exists */
  ensureDir(path: string): Promise<void>;
  /** Check if a file exists */
  exists(path: string): Promise<boolean>;
  /** Get files matching a pattern */
  glob(pattern: string, options?: any): Promise<string[]>;
}

/**
 * Resource manager interface
 */
export interface ResourceManager {
  /** Deploy resources to the server */
  deployResources(distDir: string): Promise<void>;
  /** Reload a resource */
  reloadResource(resourceName: string): Promise<void>;
}

/**
 * Watcher interface
 */
export interface Watcher {
  /** Start watching for changes */
  watch(paths: string[], onChange: (path: string) => void): void;
  /** Stop watching */
  stop(): void;
}

/**
 * Build pipeline interface
 */
export interface BuildPipeline {
  /** Add a stage to the pipeline */
  addStage(name: string, handler: (context: BuildContext) => Promise<void>): BuildPipeline;
  /** Run the pipeline */
  run(context: BuildContext): Promise<void>;
}

/**
 * Manifest generator interface
 */
export interface ManifestGenerator {
  /** Generate a manifest */
  generate(config: any, outputPath: string): Promise<void>;
}

/**
 * Webview builder interface
 */
export interface WebviewBuilder {
  /** Build webview for a plugin */
  buildPluginWebview(plugin: Plugin, distDir: string): Promise<string>;
  /** Build webview for all plugins */
  buildWebview(plugins: Plugin[], distDir: string): Promise<string>;
}
