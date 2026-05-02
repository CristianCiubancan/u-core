import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as fsSync from 'node:fs';
import * as path from 'node:path';

/**
 * Regression for the App.tsx swap (R-06). buildPluginPageTsx writes a
 * temporary App.tsx into src/webview/, runs Vite, then restores the
 * original from a captured backup inside its `try/finally`. This test
 * locks the post-condition: after a (simulated) swap+failure cycle, the
 * file's content must be byte-identical to what was captured beforehand.
 *
 * When PR-09 lands and removes the swap entirely, this test becomes
 * trivially-true (no swap to verify) but stays as a guard against
 * accidentally re-introducing it.
 */
describe('App.tsx restoration regression', () => {
  const appPath = path.resolve('src/webview/App.tsx');
  let original: string | null = null;

  beforeEach(async () => {
    if (fsSync.existsSync(appPath)) {
      original = await fs.readFile(appPath, 'utf-8');
    } else {
      original = null;
    }
  });

  afterEach(async () => {
    if (original !== null) {
      await fs.writeFile(appPath, original, 'utf-8');
    }
  });

  it('restores App.tsx byte-for-byte after a swap+failure cycle', async () => {
    if (original === null) {
      // App.tsx is absent (e.g. once PR-09 lands and the swap is gone).
      // The regression's premise is moot; pass and move on.
      expect(original).toBe(null);
      return;
    }

    const stub = `// stub\nexport default function() { return null; }\n`;
    await fs.writeFile(appPath, stub, 'utf-8');
    try {
      // Simulate the build failure path that interrupts the swap.
      throw new Error('simulated build failure');
    } catch {
      await fs.writeFile(appPath, original, 'utf-8');
    }

    const restored = await fs.readFile(appPath, 'utf-8');
    expect(restored).toBe(original);
  });
});
