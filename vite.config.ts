import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  root: 'src/',
  base: './',
  plugins: [react()],
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
    // Output build to dist/web relative to project root (src is Vite root)
    // Ensure dist/web is emptied prior to building, even if outside root
    emptyOutDir: true,
    outDir: '../dist/webview',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        // Separate vendor code into its own chunk
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
  },
});
