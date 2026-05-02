import { describe, it, expect } from 'vitest';
import { BuildManager } from '../src/scripts/managers/BuildManager.js';
import { FileManager } from '../src/scripts/managers/FileManager.js';

/**
 * Snapshot-style test for the fxmanifest.lua emission. Locks down the
 * shape of a typical plugin's generated manifest so future refactors of
 * BuildManager.generateFxManifest don't silently break the wire format
 * FXServer relies on.
 */
describe('fxmanifest snapshot', () => {
  it('emits expected fxmanifest fields for a typical manifest', () => {
    const fm = new FileManager('src/plugins');
    const bm = new BuildManager(fm, 'tmp');
    // generateFxManifest is private; exercise it via a typed cast.
    const generate = (
      bm as unknown as {
        generateFxManifest(plugin: unknown): string;
      }
    ).generateFxManifest.bind(bm);

    const plugin = {
      pluginName: 'test-plugin',
      manifest: {
        fx_version: 'cerulean',
        games: ['gta5'],
        author: 'tester',
        version: '1.0.0',
        client_scripts: ['client.lua'],
        server_scripts: ['server/index.js'],
        ui_page: 'html/index.html',
      },
    };

    const out = generate(plugin);

    expect(out).toContain("fx_version 'cerulean'");
    expect(out).toContain("games { 'gta5' }");
    expect(out).toContain("author 'tester'");
    expect(out).toContain("version '1.0.0'");
    expect(out).toContain("client_script 'client.lua'");
    expect(out).toContain("server_script 'server/index.js'");
    expect(out).toContain("ui_page 'html/index.html'");
  });
});
