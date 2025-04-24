/**
 * File system utilities index
 * Exports all file system utilities from a single entry point
 */

// Export the FileSystem interface and implementation
export { FileSystem } from '../../core/types.js';
export { FileSystemImpl } from './FileSystemImpl.js';

// Export path utilities
export * from './PathUtils.js';

// Export plugin utilities
export * from './PluginUtils.js';

// Export script utilities
export * from './ScriptUtils.js';

// Export configuration utilities
export * from './ConfigUtils.js';

// Export logging utilities
export * from './LogUtils.js';

// Export process utilities
export * from './ProcessUtils.js';

// Export HTML utilities
export * from './HtmlUtils.js';

// Export Resource Manager
export * from './ResourceManager.js';

// Create and export a singleton instance of FileSystemImpl for convenience
import { FileSystemImpl } from './FileSystemImpl.js';
export const fileSystem = new FileSystemImpl();
