import { PluginManifest } from './Manifest.js';
import { File } from '../types/File.js';

export interface Plugin {
  pluginName: string;
  fullPath: string;
  displayPath: string; // New property for display with forward slashes
  parents: string[]; // Array of parent directories with forward slashes
  files: File[];
  manifest?: PluginManifest;
}
