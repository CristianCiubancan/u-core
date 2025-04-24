# U-Core

A modular core framework for FiveM server development.

## Overview

U-Core provides a structured, plugin-based architecture for building FiveM servers. It uses modern web technologies and a streamlined build system to make development efficient and maintainable.

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/u-core.git
   cd u-core
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

## Usage

### Building the project

To build the entire project:

```bash
pnpm build
```

This will:

- Compile all TypeScript files
- Build all plugins
- Generate webview assets
- Create the final distribution in the `dist` folder

### Development mode

For development with hot reloading:

```bash
pnpm dev
```

This will:

- Build the project
- Watch for changes in source files
- Automatically rebuild affected components
- Trigger resource reloads in FiveM when necessary

## Project Structure

```
u-core/
├── src/
│   ├── core/           # Core framework functionality
│   ├── plugins/        # Individual plugins
│   ├── scripts/        # Build system scripts
│   └── utils/          # Utility functions
├── dist/               # Compiled output
└── package.json        # Project configuration
```

## Build System

The build system has been completely transitioned from the legacy system to a new, more efficient implementation. All legacy build scripts and references have been removed. The new system:

- Processes plugins in the correct order (core plugins first, then regular plugins)
- Properly handles webview resources
- Provides more reliable hot reloading
- Maintains identical output structure to ensure compatibility

### Key improvements:

- Better handling of plugin.json files
- Proper webview asset generation
- Improved resource reloading with appropriate debounce time
- Cleaner, more maintainable codebase
- Removal of all legacy build system references

## Development Workflow

1. Create or modify plugins in the `src/plugins` directory
2. Run `pnpm dev` to start the development server
3. Make changes to your code
4. The system will automatically rebuild and reload affected resources

## Notes

- Changes to files in the `src/webview` folder require restarting the dev command
- The build system uses environment variables that can be configured in a `.env` file

## License

ISC
