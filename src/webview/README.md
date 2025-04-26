# Webview Resource

This directory contains the main code for the webview resource, which includes all the UI components and webviews for our plugins.

## Overview

The webview resource serves two main purposes:

1. **Shared Component Library**: A collection of reusable UI components that can be used across all plugins to ensure a consistent look and feel.
2. **Webview Build System**: A custom build step that imports all the webviews found in our plugins into a single App.tsx file, so they get built together into a single page.

## Component Library

The `components` directory contains a set of reusable UI components that should be used across all plugins. These components are designed to be consistent with the application's design system and provide a unified user experience.

For detailed documentation on available components and how to use them, see [COMPONENTS.md](./COMPONENTS.md).

## Webview Build System

We use a custom build step where we import all the webviews found in our plugins into our main webview App.tsx, so they get built together into a single page. This approach has several benefits:

- Reduces bundle size by sharing common dependencies
- Ensures consistent styling across all plugins
- Simplifies the build process

## Usage in Plugins

When creating a new plugin with a UI component, follow these guidelines:

1. Create a `Page.tsx` file in the plugin's `html` directory
2. Import and use components from the shared component library
3. The build system will automatically detect and include your Page component in the build

Example:

```tsx
// src/plugins/[misc]/example/html/Page.tsx
import { Button, Card } from '../../../../webview/components';

export default function Page() {
  return (
    <Card title="My Plugin">
      <Button onClick={handleAction}>Click Me</Button>
    </Card>
  );
}
```

## Styling

We use Tailwind CSS for styling components. The configuration is in `tailwind.config.js`. For more information on our color system and design tokens, see [COLOR_SYSTEM.md](./COLOR_SYSTEM.md).
