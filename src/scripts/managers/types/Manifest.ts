// .\types\PluginManifest.ts

/**
 * Represents a plugin manifest file (plugin.json)
 * Based on the fxmanifest.lua schema
 */
export interface PluginManifest {
  // Core metadata
  name: string;
  description?: string;
  author?: string;
  version?: string;

  // Framework version identifiers
  fx_version?: string;

  // Supported games/platforms
  games?: string[];

  // Scripts
  client_scripts?: string | string[];
  server_scripts?: string | string[];
  shared_scripts?: string | string[];

  // UI related properties
  ui_page?: string;

  // Dependencies
  dependencies?: string[];
  provide?: string | string[];

  // Runtime constraints (similar to dependencies in fxmanifest)
  constraints?: {
    server?: string;
    policy?: string[];
    onesync?: boolean;
    gameBuild?: string;
    natives?: string[];
  };

  // File definitions
  files?: string[];
  data_files?: Array<{
    type: string;
    files: string | string[];
  }>;

  // Map related
  is_map?: boolean;

  // Server related
  server_only?: boolean;

  // Loading screen related
  loadscreen?: string;
  loadscreen_manual_shutdown?: boolean;

  // Exports
  exports?: string[];
  server_exports?: string[];

  // Additional configuration options
  config?: Record<string, any>;

  // Any other custom metadata (allows for plugin-specific extensions)
  [key: string]: any;
}

/**
 * Type representing a simplified plugin.json for initial loading
 * Contains only the essential fields needed for plugin identification/registration
 */
export interface BasicPluginManifest {
  name: string;
  version?: string;
  description?: string;
  author?: string;
}
