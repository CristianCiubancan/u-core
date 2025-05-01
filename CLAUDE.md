# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands
- Build all plugins: `pnpm build`
- Development with hot reloading: `pnpm dev`
- Start asset server: `pnpm start:assets`
- Start Docker containers: `pnpm start:docker`
- Windows startup: `pnpm start:windows`

## Code Style Guidelines
- **Typescript**: Use strict mode with explicit types for parameters and returns
- **Components**: Functional React components with arrow functions and typed props
- **Imports**: Group by external/internal, React imports first
- **Naming**: PascalCase for components, camelCase for variables/functions
- **Architecture**: Follow plugin-based structure with client/server/shared separation
- **Error Handling**: Use TypeScript's strict checking for type safety
- **File Structure**: Keep components, utilities, and types in dedicated directories
- **JSX**: Use consistent Tailwind classes for styling

## Project Structure
- `/src/plugins/` - Plugin system with character creation/editing features
- `/src/scripts/` - Build tooling with managers for different aspects
- `/src/webview/` - React UI components and theming
- `/asset-server/` - Asset handling and optimization

For detailed configuration, reference tsconfig files and package.json scripts.