import * as path from 'path';
import type { Plugin } from 'vite';

/**
 * Resolves `import Page from 'virtual:plugin-page'` to the per-plugin
 * Page.tsx file. BuildManager passes the path directly so multiple
 * consumer Vite builds can run in parallel without racing — using
 * `process.env.U_CORE_PLUGIN_PAGE` as the carrier was a foot-gun: the
 * env var is process-global, so when two `vite build` calls overlap
 * they both end up resolving the virtual module to whichever path was
 * last written, silently shipping one plugin's bundle inside another's
 * resource directory. Standalone mode (auto-discovered via the root
 * `vite.config.ts`) still falls back to the env var since it builds
 * one plugin at a time and has no other channel to receive the path.
 *
 * Lives in `src/scripts/util/` so both `vite.config.ts` and
 * `BuildManager` (consumer/shared lib-mode builds bypass auto-discovery
 * and pass plugins explicitly) can share the exact same resolver.
 */
export const VIRTUAL_PAGE_ID = 'virtual:plugin-page';
const RESOLVED_VIRTUAL_PAGE_ID = '\0' + VIRTUAL_PAGE_ID;

export function pluginPageEntry(pagePath?: string): Plugin {
  return {
    name: 'u-core:plugin-page-entry',
    enforce: 'pre',
    resolveId(id) {
      if (id === VIRTUAL_PAGE_ID) return RESOLVED_VIRTUAL_PAGE_ID;
      return null;
    },
    load(id) {
      if (id !== RESOLVED_VIRTUAL_PAGE_ID) return null;
      const target = pagePath ?? process.env.U_CORE_PLUGIN_PAGE;
      if (!target) {
        throw new Error(
          'pluginPageEntry needs a pagePath argument or U_CORE_PLUGIN_PAGE env var. The webview build must be invoked through BuildManager so the per-plugin Page.tsx entry is provided.'
        );
      }
      const abs = path.resolve(target).replace(/\\/g, '/');
      return `export { default } from ${JSON.stringify(abs)};\n`;
    },
  };
}
