# File System Utilities

This directory contains a set of utilities for working with the file system and related operations in a consistent and DRY manner.

## Overview

The utilities are organized into several modules:

- **FileSystemImpl**: Core file system operations (read, write, copy, etc.)
- **PathUtils**: Path manipulation and normalization
- **PluginUtils**: Plugin-specific operations
- **ScriptUtils**: Script processing and bundling
- **ConfigUtils**: Configuration loading and management
- **LogUtils**: Consistent logging across the codebase
- **ProcessUtils**: Process management utilities

## Usage

Import the utilities from the index file:

```typescript
import { 
  fileSystem,
  normalizePath,
  findPluginPaths,
  processFile,
  loadEnvFile,
  info,
  executeCommand
} from './utils/fs/index.js';
```

## Available Utilities

### FileSystem

The `fileSystem` object provides a consistent interface for file system operations:

```typescript
// Read a file
const content = await fileSystem.readFile('path/to/file.txt');

// Write a file
await fileSystem.writeFile('path/to/file.txt', 'Hello, world!');

// Check if a file exists
const exists = await fileSystem.exists('path/to/file.txt');

// Create a directory
await fileSystem.ensureDir('path/to/directory');

// Find files matching a pattern
const files = await fileSystem.glob('**/*.ts');
```

### Path Utilities

Functions for working with paths:

```typescript
// Get project paths
const paths = getProjectPaths();

// Normalize a path
const normalizedPath = normalizePath('path/with\\mixed/separators');

// Join path segments
const path = joinPath('dir', 'subdir', 'file.txt');

// Get relative path
const relativePath = getRelativePath('/root/dir', '/root/dir/subdir/file.txt');
```

### Plugin Utilities

Functions for working with plugins:

```typescript
// Find all plugin paths
const pluginPaths = findPluginPaths('src/plugins');

// Parse plugin paths into Plugin objects
const plugins = parsePluginPaths(pluginPaths);

// Parse plugin files
const files = parsePluginFiles('path/to/plugin');

// Read plugin JSON
const pluginJson = readPluginJson('path/to/plugin/plugin.json');
```

### Script Utilities

Functions for processing script files:

```typescript
// Process a file
const result = await processFile(file, outputDir);

// Get plugin scripts
const scripts = getPluginScripts(pluginJson, pluginPath);
```

### Configuration Utilities

Functions for working with configuration:

```typescript
// Load environment variables from .env file
const env = await loadEnvFile('.env');

// Get configuration
const config = getConfig();

// Generate a manifest file
await generateManifest('resource-name', files, 'path/to/manifest.lua');
```

### Logging Utilities

Functions for consistent logging:

```typescript
// Configure the logger
configureLogger({ level: LogLevel.DEBUG, prefix: 'MyModule' });

// Log messages
debug('Debug message');
info('Info message');
warn('Warning message');
error('Error message');

// Create a logger with a specific prefix
const logger = createLogger('MyComponent');
logger.info('Component info message');
```

### Process Utilities

Functions for working with child processes:

```typescript
// Execute a command
const result = await executeCommand('npm', ['install']);

// Execute a command with output streaming
const code = await executeCommandWithOutput('npm', ['run', 'build']);

// Start a long-running process
const process = startProcess('npm', ['run', 'dev']);

// Kill a process
killProcess(process);
```

## Best Practices

1. Always use these utilities instead of direct Node.js file system or process APIs
2. Use the `fileSystem` object for file operations
3. Use `normalizePath` to ensure consistent path separators
4. Use the logging utilities for consistent log formatting
5. Use the process utilities for running external commands
