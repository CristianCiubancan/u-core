# U-Core: FiveM Plugin Framework

U-Core is a modern, TypeScript-based framework for developing and managing FiveM server resources. It provides a structured approach to building plugins with a powerful build system that handles TypeScript compilation, React UI components, and automatic resource reloading.

![FiveM](https://img.shields.io/badge/FiveM-Compatible-brightgreen)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)
![React](https://img.shields.io/badge/React-19.0+-61DAFB)

## 🌟 Features

- **Plugin-Based Architecture**: Organize your server resources as modular plugins
- **TypeScript Support**: Full TypeScript support for client, server, and shared code
- **React UI Framework**: Build modern UIs with React for your FiveM resources
- **Hot Reloading**: Automatic resource reloading during development
- **Bundling**: Efficient bundling of JavaScript/TypeScript files with esbuild
- **Docker Support**: Easy deployment with Docker and Docker Compose
- **Database Integration**: Built-in MariaDB database support
- **Resource Management**: API for managing and reloading resources

## 📋 Prerequisites

- [Node.js](https://nodejs.org/) (v18 or newer)
- [pnpm](https://pnpm.io/) (v10.8.0 or newer)
- [FiveM Server](https://docs.fivem.net/docs/server-manual/setting-up-a-server/) (for running the resources)
- [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/) (optional, for containerized deployment)

## 🚀 Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/u-core.git
   cd u-core
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Create a `.env` file based on the example:
   ```bash
   cp .env.example .env
   ```

4. Edit the `.env` file with your configuration settings.

## 🔧 Development

### Building Resources

To build all resources:

```bash
pnpm build
```

### Development Mode

To start development mode with hot reloading:

```bash
pnpm dev
```

This will:
1. Build all plugins
2. Watch for changes in source files
3. Automatically rebuild affected resources when files change
4. Trigger resource reloading in the FiveM server

## 📁 Project Structure

```
u-core/
├── dist/                  # Build output directory
├── src/
│   ├── core/              # Core framework code
│   ├── plugins/           # Plugin resources
│   │   ├── [default]/     # Default plugins
│   │   │   └── core/      # Core plugin
│   │   ├── [misc]/        # Miscellaneous plugins
│   │   └── example2/      # Example plugin
│   ├── scripts/           # Build system scripts
│   │   ├── cli/           # Command-line interface
│   │   ├── managers/      # Build managers
│   │   └── types/         # TypeScript types
│   ├── utils/             # Utility functions
│   └── webview/           # Webview UI components
├── .env                   # Environment configuration
├── docker-compose.yml     # Docker Compose configuration
├── Dockerfile             # Docker configuration
└── package.json           # Project dependencies
```

## 🔌 Plugin Structure

Each plugin follows this structure:

```
plugin-name/
├── client/               # Client-side scripts
├── server/               # Server-side scripts
├── shared/               # Shared scripts
├── html/                 # UI files
│   └── Page.tsx          # React component for UI
├── translations/         # Localization files
└── plugin.json           # Plugin manifest
```

### Plugin Manifest (plugin.json)

```json
{
  "name": "example",
  "version": "1.0.0",
  "fx_version": "cerulean",
  "author": "Your Name",
  "description": "Example plugin",
  "games": ["gta5", "rdr3"],
  "client_scripts": ["client/*.js"],
  "server_scripts": ["server/*.js"],
  "shared_scripts": ["shared/*.js"],
  "files": ["translations/*.json", "html/**/*"],
  "ui_page": "html/index.html"
}
```

## 🐳 Docker Deployment

To deploy using Docker:

1. Configure your `.env` file with appropriate settings
2. Build and start the containers:
   ```bash
   docker-compose up -d
   ```

This will start:
- A FiveM server container
- A MariaDB database container

## 🔄 Resource Reloading

The framework includes a resource reloading system that automatically detects changes and reloads affected resources. This is controlled through environment variables:

```
RELOADER_API_KEY=***SCRUBBED***
RELOADER_HOST=localhost
RELOADER_PORT=3414
```

## 🌐 Webview UI Development

The framework supports React-based UIs for your plugins:

1. Create a `Page.tsx` file in your plugin's `html` directory
2. The build system will automatically:
   - Bundle the React component
   - Generate the necessary HTML files
   - Include the UI in the plugin's manifest

Example Page.tsx:
```tsx
import React from 'react';

export const Page: React.FC = () => {
  return (
    <div className="container">
      <h1>My Plugin UI</h1>
      <p>This is a React-based UI for my FiveM plugin</p>
    </div>
  );
};
```

## 📚 API Documentation

### FileManager

The `FileManager` class provides utilities for working with the file system:

```typescript
import { FileManager } from './managers/FileManager';

const fileManager = new FileManager('src/plugins');
const plugins = await fileManager.findPlugins();
```

### PluginManager

The `PluginManager` class handles plugin building and deployment:

```typescript
import { PluginManager } from './managers/PluginManager';

const pluginManager = new PluginManager(fileManager, 'dist');
await pluginManager.buildPlugin(plugin);
```

### BuildManager

The `BuildManager` class orchestrates the build process:

```typescript
import { BuildManager } from './managers/BuildManager';

const buildManager = new BuildManager(fileManager, 'dist');
await buildManager.buildAll();
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the ISC License - see the LICENSE file for details.
