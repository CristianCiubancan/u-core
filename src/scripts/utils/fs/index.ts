/**
 * File system utilities index
 * Exports all file system utilities from a single entry point
 */

// Export the FileSystemImpl implementation
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

// Export Watcher Manager
export * from './WatcherManager.js';

// Export Debounced Task Manager
export * from './DebouncedTaskManager.js';

// Export Rebuild Utilities
export * from './RebuildUtils.js';

// Create and export a singleton instance of FileSystemImpl for convenience
import { FileSystemImpl } from './FileSystemImpl.js';
export const fileSystem = new FileSystemImpl();
