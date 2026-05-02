import * as path from 'path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const VIRTUAL_PAGE_ID = 'virtual:plugin-page';
const RESOLVED_VIRTUAL_PAGE_ID = '\0' + VIRTUAL_PAGE_ID;

// Resolves `import Page from 'virtual:plugin-page'` to the Page.tsx file
// pointed at by U_CORE_PLUGIN_PAGE. BuildManager sets this env var per
// plugin before invoking `vite build`, which removes the need to mutate
// src/webview/App.tsx between builds — and lets cross-plugin webview builds
// run in parallel.
function pluginPageEntry(): Plugin {
  return {
    name: 'u-core:plugin-page-entry',
    enforce: 'pre',
    resolveId(id) {
      if (id === VIRTUAL_PAGE_ID) return RESOLVED_VIRTUAL_PAGE_ID;
      return null;
    },
    load(id) {
      if (id !== RESOLVED_VIRTUAL_PAGE_ID) return null;
      const target = process.env.U_CORE_PLUGIN_PAGE;
      if (!target) {
        throw new Error(
          'U_CORE_PLUGIN_PAGE is not set. The webview build must be invoked through BuildManager so the per-plugin Page.tsx entry is provided.'
        );
      }
      const abs = path.resolve(target).replace(/\\/g, '/');
      return `export { default } from ${JSON.stringify(abs)};\n`;
    },
  };
}

export default defineConfig({
  root: 'src/',
  base: './',
  plugins: [pluginPageEntry(), react()],
  environments: {
    production: {
      define: {
        'process.env': {
          ASSET_SERVER_URL: 'https://localhost:3000',
        },
      },
    },
    development: {
      define: {
        'process.env': {
          ASSET_SERVER_URL: 'https://localhost:3000',
        },
      },
    },
  },
  build: {
    emptyOutDir: true,
    outDir: '../dist/webview',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
  },
});
