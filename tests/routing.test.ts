import { describe, it, expect } from 'vitest';
import { BuildManager } from '../src/scripts/managers/BuildManager.js';
import { FileManager } from '../src/scripts/managers/FileManager.js';

/**
 * The path-based platform classifier (server vs. client) is the contract
 * that decides whether a TypeScript entry is bundled with platform: 'node'
 * (Node built-ins externalized) or platform: 'browser'. A wrong answer
 * here means client code crashes at runtime trying to require Node
 * modules, or server code drops Node externals into its bundle. R-12.
 */
describe('server/client routing classification', () => {
  const bm = new BuildManager(new FileManager('src/plugins'), 'tmp');
  const isServer = (
    bm as unknown as { isServerScript(filePath: string): boolean }
  ).isServerScript.bind(bm);

  it('classifies posix /server/ paths as server', () => {
    expect(isServer('/repo/src/plugins/foo/server/index.ts')).toBe(true);
  });

  it('classifies windows \\server\\ paths as server', () => {
    expect(isServer('C:\\repo\\src\\plugins\\foo\\server\\index.ts')).toBe(
      true
    );
  });

  it('classifies /client/ paths as not-server', () => {
    expect(isServer('/repo/src/plugins/foo/client/index.ts')).toBe(false);
  });

  it('classifies /shared/ paths as not-server', () => {
    expect(isServer('/repo/src/plugins/foo/shared/types.ts')).toBe(false);
  });
});
