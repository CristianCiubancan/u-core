import { Plugin } from './Plugin.js';

export interface File {
  fileName: string;
  fullPath: string;
  displayPath: string;
  plugin: Plugin;
}
