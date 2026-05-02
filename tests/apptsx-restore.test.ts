import { describe, it, expect } from 'vitest';
import * as fsSync from 'node:fs';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

/**
 * Tombstone for the App.tsx swap (R-06 / PR-09). The legacy build pipeline
 * overwrote `src/webview/App.tsx` with a stub before each per-plugin Vite
 * build and tried to restore it afterwards. PR-09 deleted the swap and the
 * file itself; the page entry now arrives through the `virtual:plugin-page`
 * Vite plugin (vite.config.ts:pluginPageEntry, BuildManager.buildPluginPageTsx).
 *
 * These guards inspect the production tree to confirm both halves of that
 * removal stay intact. If either fails, someone is reintroducing the swap.
 */
describe('App.tsx swap removal', () => {
  it('does not ship a src/webview/App.tsx', () => {
    const appPath = path.resolve('src/webview/App.tsx');
    expect(fsSync.existsSync(appPath)).toBe(false);
  });

  it('BuildManager does not write to App.tsx', async () => {
    const buildManagerSrc = await fs.readFile(
      path.resolve('src/scripts/managers/BuildManager.ts'),
      'utf-8'
    );
    // The swap pattern was `fs.writeFile(appTsxPath, …)`; if any writeFile
    // call references App.tsx the swap is back.
    expect(buildManagerSrc).not.toMatch(/writeFile(?:Sync)?\s*\([^)]*App\.tsx/);
  });
});
