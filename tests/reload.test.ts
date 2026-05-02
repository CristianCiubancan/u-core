import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as http from 'http';
import { AddressInfo } from 'net';
import { PluginReloadManager } from '../src/scripts/managers/PluginReloadManager.js';

/**
 * Stubs the resource-management endpoint that PluginReloadManager
 * normally talks to in-game and asserts the round-trip protocol:
 *  - GET /resources answers the readiness probe (initialize),
 *  - POST /restart?resource=<name> answers reloadResource,
 * with the manager parsing the JSON response into ReloadResult.
 */
describe('reload protocol stub', () => {
  let server: http.Server;
  let port: number;

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      const url = new URL(req.url ?? '/', 'http://localhost');
      if (url.pathname === '/resources') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ resources: ['core'] }));
        return;
      }
      if (url.pathname === '/restart') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: true,
            message: 'reloaded',
            resource: url.searchParams.get('resource'),
          })
        );
        return;
      }
      res.writeHead(404);
      res.end();
    });
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', () => resolve())
    );
    port = (server.address() as AddressInfo).port;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) =>
      server.close(() => resolve())
    );
  });

  it('initializes against a healthy /resources probe', async () => {
    const mgr = new PluginReloadManager({ apiKey: 'test-key', port });
    await mgr.initialize();
    expect(mgr).toBeDefined();
  });

  it('reloads a resource and parses the JSON response', async () => {
    const mgr = new PluginReloadManager({ apiKey: 'test-key', port });
    await mgr.initialize();
    const result = await mgr.reloadResource('core');
    expect(result.success).toBe(true);
    expect(result.resource).toBe('core');
  });
});
