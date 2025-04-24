# Utilities

This directory contains utility functions and modules used throughout the codebase.

## Directory Structure

- **fs/**: File system and related utilities (see [fs/README.md](./fs/README.md) for details)
- **bundler.js**: JavaScript and TypeScript bundling utilities
- **file.ts**: Legacy file utilities (deprecated, use fs/ instead)
- **paths.ts**: Legacy path utilities (deprecated, use fs/ instead)
- **webview.ts**: Webview building and processing utilities

## Migration Guide

The codebase is transitioning from the older, less organized utility files to the new modular structure in the `fs/` directory.

### Before:

```typescript
import * as fs from 'fs';
import * as path from 'path';
import { ensureDirectoryExists, getPluginsPaths } from './utils/file.js';
import { getProjectPaths } from './utils/paths.js';
```

### After:

```typescript
import { 
  fileSystem, 
  findPluginPaths, 
  getProjectPaths 
} from './utils/fs/index.js';
```

## Best Practices

1. Use the utilities in the `fs/` directory for new code
2. Gradually migrate existing code to use the new utilities
3. Keep the codebase DRY by using these shared utilities
4. Follow the patterns established in the utility modules
5. Add documentation for new utilities
