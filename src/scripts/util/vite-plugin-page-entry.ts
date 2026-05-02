import * as path from 'path';
import type { Plugin } from 'vite';

/**
 * Resolves `import Page from 'virtual:plugin-page'` to the Page.tsx file
 * pointed at by `process.env.U_CORE_PLUGIN_PAGE`. BuildManager sets that
 * env var per plugin before invoking `vite build`, which removes the need
 * to mutate `src/webview/App.tsx` between builds and lets cross-plugin
 * webview builds run in parallel.
 *
 * Lives in `src/scripts/util/` so both `vite.config.ts` (the standalone
 * mode auto-discovers it) and `BuildManager` (consumer/shared lib-mode
 * builds bypass auto-discovery and pass plugins explicitly) can share the
 * exact same resolver.
 */
export const VIRTUAL_PAGE_ID = 'virtual:plugin-page';
const RESOLVED_VIRTUAL_PAGE_ID = '\0' + VIRTUAL_PAGE_ID;

export function pluginPageEntry(): Plugin {
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
