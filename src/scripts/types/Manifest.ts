// Mirror of src/utils/schema.json. Keep in sync — FileManager validates every
// plugin.json against the JSON schema at startup. The type surface stays
// strict (no catch-all index signature); custom properties are still tolerated
// at runtime by getCustomProperties in BuildManager, which validates each key
// against the identifier regex before emission.

export type FxVersion = 'cerulean' | 'bodacious' | 'adamant';
export type Game = 'gta5' | 'rdr3';

export type ScriptList = string | string[];

export interface DataFile {
  type: string;
  files: string | string[];
}

export interface PluginConstraints {
  server?: string;
  policy?: string[];
  onesync?: boolean;
  gameBuild?: string;
  natives?: string[];
}

export type ConfigValue = string | number | boolean;

export interface PluginManifest {
  name: string;
  version: string;
  fx_version: FxVersion;
  games?: Game[];
  author?: string;
  description?: string;
  client_scripts?: ScriptList;
  server_scripts?: ScriptList;
  shared_scripts?: ScriptList;
  exports?: string[];
  server_exports?: string[];
  ui_page?: string;
  data_files?: DataFile[];
  is_map?: boolean;
  server_only?: boolean;
  loadscreen?: string;
  loadscreen_manual_shutdown?: boolean;
  files?: string[];
  dependencies?: string[];
  lua54?: boolean;
  provide?: string | string[];
  constraints?: PluginConstraints;
  config?: Record<string, ConfigValue>;
}

export interface BasicPluginManifest {
  name: string;
  version?: string;
  description?: string;
  author?: string;
}
