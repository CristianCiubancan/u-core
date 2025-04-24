# Utilities

This directory contains utility functions and modules used throughout the codebase.

## Directory Structure

- **fs/**: File system and related utilities (see [fs/README.md](./fs/README.md) for details)
- **bundler.js**: JavaScript and TypeScript bundling utilities
- **webview.ts**: Webview building and processing utilities

## Usage

Import utilities from the fs directory:

```typescript
import {
  fileSystem,
  findPluginPaths,
  getProjectPaths,
  generateHtmlContent,
  generateManifest,
} from './utils/fs/index.js';
```

## Best Practices

1. Use the utilities in the `fs/` directory for new code
2. Gradually migrate existing code to use the new utilities
3. Keep the codebase DRY by using these shared utilities
4. Follow the patterns established in the utility modules
5. Add documentation for new utilities
