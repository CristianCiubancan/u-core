import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { pluginPageEntry } from './src/scripts/util/vite-plugin-page-entry.ts';

// `pluginPageEntry` is shared with BuildManager: standalone builds reach
// it via this auto-discovered config; consumer/shared lib-mode builds
// import it directly because they bypass `configFile` to avoid the
// `manualChunks` setting below (incompatible with `inlineDynamicImports`,
// which Rollup auto-enables for IIFE/lib output).

export default defineConfig({
  root: 'src/',
  base: './',
  plugins: [pluginPageEntry(), react()],
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
