# Build System

This directory contains the build system for the project. The build system is responsible for building plugins, core resources, and webview UIs.

## Directory Structure

- **cli/**: Command-line interface for the build system
- **core/**: Core types and interfaces for the build system
- **utils/**: Utility functions and classes for the build system
  - **bundler/**: Bundling utilities for JavaScript and TypeScript files
  - **builder/**: Plugin building utilities
  - **fs/**: File system utilities
  - **logger/**: Logging utilities
  - **webview/**: Webview building utilities

## Object-Oriented Architecture

The build system follows an object-oriented architecture with the following key classes:

- **BundlerService**: Handles bundling of JavaScript and TypeScript files
- **PluginBuilder**: Builds plugins and generates manifests
- **WebviewBuilder**: Builds webview UIs for plugins
- **ScriptProcessor**: Processes script files and categorizes them
- **FileSystemImpl**: Provides file system operations
- **PluginUtils**: Utilities for working with plugins
- **ResourceManager**: Manages resources and deployment

## Usage

### Building Plugins

```typescript
import { pluginBuilder } from './utils/builder';

// Build all plugins
await pluginBuilder.build();

// Build a specific plugin
const result = await pluginBuilder.buildPlugin(plugin, distDir);
```

### Building Webviews

```typescript
import { webviewBuilder } from './utils/webview';

// Build webview for all plugins
await webviewBuilder.buildWebview(plugins, distDir);

// Build webview for a specific plugin
const result = await webviewBuilder.buildPluginWebview(plugin, distDir);
```

### Bundling Files

```typescript
import { bundlerService } from './utils/bundler';

// Bundle TypeScript file
await bundlerService.bundleTypeScript(inputFile, outputFile, isReact);

// Bundle JavaScript file
await bundlerService.bundleJavaScript(inputFile, outputFile);
```

### Processing Script Files

```typescript
import { scriptProcessor } from './utils/fs';

// Process a file
const result = await scriptProcessor.processFile(file, outputDir);

// Get plugin scripts
const scripts = scriptProcessor.getPluginScripts(pluginJson, pluginPath);

// Categorize files
const categorized = scriptProcessor.categorizeFiles(processedFiles);
```

## Command-Line Interface

The build system can be used from the command line:

```bash
# Build all plugins
pnpm tsx src/scripts/index.ts build

# Build and watch for changes
pnpm tsx src/scripts/index.ts dev

# Show help
pnpm tsx src/scripts/index.ts help
```
