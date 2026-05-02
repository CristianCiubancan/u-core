# P7 — Synthesis & Remediation Plan

Source: P0–P6 audits at `audit/0[0-6]-*.md` against `master @ ffae3e5e` (2026-05-02). Severity inherits from source reports; cross-cutting findings listed once.

---

## 1. Executive summary

- **Multiple production credentials are committed to git and reachable on `0.0.0.0`** by default — DB root password, the in-game reload-endpoint placeholder API key, Docker port-publishes for `3306` and `3414`. Anyone running `pnpm start:docker` on an internet-reachable host gives an attacker root MariaDB and remote `restartallresources` control.
- **The build pipeline emits ~31 MB of dead IIFE bundles per `character-create` build** because `BuildManager` walks every `.ts` file as an entry point instead of consuming `plugin.json`'s declared scripts. Two of four plugins are 3-line stubs that still pay full Vite cold-starts (5.8 s of the 15.7 s build). Inline base64 sourcemaps with `sourcesContent` ship full TypeScript to every connecting FiveM player.
- **`src/webview/App.tsx` is a build artifact that escaped its try/finally and is committed to git.** The swap is unsafe under crashes, unsafe under concurrent processes, and forces every cross-plugin webview build to be sequential. It is also the single architectural footgun that blocks the largest performance win.
- **Manifest correctness is fiction:** `src/utils/schema.json` exists but nothing reads it, `plugin.json` is `JSON.parse + as PluginManifest` with no validation, missing fields silently default, wrong types crash inside `escapeLuaString`, boolean `lua54: true` emits Lua *string* `lua54 'true'`, objects emit `'[object Object]'`. `name` and `config` are silently dropped. The `tsconfig` solution leaks `@types/node` into NUI/browser code and exposes both `@citizenfx/client` and `@citizenfx/server` natives ambient to all plugin code.
- **Zero tests, zero CI, no LICENSE file despite ISC declared, no lint/format, three log paths of which `--log-level` honors one, two unreachable manager classes (~500 LoC), five env vars documented but never read.** A new contributor cannot finish onboarding from the README alone.

---

## 2. Risk register

CRITICAL and HIGH findings, deduplicated. Disagreements between reports flagged inline; severity = max.

| ID | Sev | Title | Source | Affected files |
|---|---|---|---|---|
| R-01 | CRIT | `RELOADER_API_KEY` falls back to literal placeholder; `core` HTTP server binds `0.0.0.0:3414`; Docker publishes `3414:3414` on all interfaces; CORS `*`; non-constant-time compare | P0§6, P1§6, P4§1, P4§2, P6§5 | `src/plugins/[default]/core/server/index.ts:9,182,200,285`, `docker-compose.yml:12`, `.env.example:6`, `.env:6` |
| R-02 | CRIT | Real DB credentials (`***SCRUBBED***`, full Romanian sentence) committed to `.env.example`; identical to `.env`; `MYSQL_USER=root` invalid; `3306:3306` published on all interfaces | P4§7, P4§9 | `.env.example:23-26`, `.env:23-26`, `docker-compose.yml:32` |
| R-03 | CRIT | Asset-server path traversal in wildcard routes; `path.join(publicDir, quality, req.params[0])` no guard; `res.sendFile` without `root`; CORS `*`; no auth; binds all interfaces | P4§10, P5§8 | `asset-server/server.js:73-188,258` |
| R-04 | CRIT | Tree-walked `.ts` bundling emits ~31 MB of dead IIFEs per `character-create` build (barrels inline React + JSX + CSS) | P5§4 | `src/scripts/managers/BuildManager.ts:310-385` |
| R-05 | CRIT | Two stub `Page.tsx` files (`<div></div>`) trigger full Vite cold-starts costing 5.8 s = 37% of `pnpm build` | P0§1, P5§1 | `src/plugins/[character]/[auth]/character-select/html/Page.tsx`, `src/plugins/[character]/character-edit/html/Page.tsx`, `BuildManager.ts:541-547` |
| R-06 | HIGH | `src/webview/App.tsx` swap is unsafe under crashes, concurrent processes, and "no prior file"; auto-generated stub currently leaked into git; forces all webview builds sequential (blocks parallelism) | P0§3, P1§1, P1§2, P3§5, P5§2 | `BuildManager.ts:527-623,660-681`, `src/webview/App.tsx` |
| R-07 | HIGH | `name` and `config` in `plugin.json` silently dropped; booleans emit `key 'true'` (Lua string, not boolean); objects emit `'[object Object]'`; key validation absent | P1§5, P2§5 | `BuildManager.ts:1013-1278,1287-1336` |
| R-08 | HIGH | `plugin.json` parsed and cast `as PluginManifest` with no validation; `src/utils/schema.json` is dead; invalid JSON falls back to `{name}` and silently builds with all defaults; wrong types crash inside `escapeLuaString` | P2§4, P2§5, P3§1c | `src/scripts/managers/FileManager.ts:148-171,514-537`, `src/utils/schema.json` |
| R-09 | HIGH | `tsconfig.plugins.json` has no `types` whitelist → both `@citizenfx/client` and `@citizenfx/server` ambient on all plugin code; `@types/node` ambient | P2§1, P2§2 | `tsconfig.plugins.json` |
| R-10 | HIGH | `tsconfig.webview.json` has no `types`/`typeRoots` → `@types/node` ambient in NUI; `process.env.X` typechecks despite no `process` global at runtime; only Vite `define` rescues it for `ASSET_SERVER_URL` | P2§1, P2§3 | `tsconfig.webview.json`, `src/plugins/[character]/[auth]/character-create/html/utils/getClothingImage.ts` |
| R-11 | HIGH | `tsconfig.scripts.json` lacks `composite: true` but is in solution `references` → `tsc -b` from root errors silently | P2§1 | `tsconfig.scripts.json`, `tsconfig.json` |
| R-12 | HIGH | Server-vs-client detection is `path.includes('/server/')` substring → misclassifies `client/server-utils/`, `shared/` files emitted as standalone browser IIFEs and re-inlined into server | P0§2, P1§3, P2§7 | `BuildManager.ts:911-913,336,454` |
| R-13 | HIGH | esbuild externals list misses `node:`-prefixed builtins → `import 'node:fs'` is bundled, fails or stubs at runtime | P0§2, P1§3, P2§7 | `BuildManager.ts:921-942` |
| R-14 | HIGH | Reload endpoint returns `200 OK` after `StopResource` succeeds; `StartResource` runs in `setTimeout(500)`, fire-and-forget; watcher logs "✓ Reloaded" while resource is dead in-game | P1§6, P3§4 | `src/plugins/[default]/core/server/index.ts:69,118-148` |
| R-15 | HIGH | `PluginReloadManager.makeRequest` has no `req.setTimeout`; one hung request stalls watcher indefinitely (gated by `isBuilding`) | P1§6, P3§1f | `src/scripts/managers/PluginReloadManager.ts:218-275` |
| R-16 | HIGH | `initialize()` failure permanently sets `reloadManager = null`; never retries even after FXServer comes up | P3§1f, P3§4 | `BuildManager.ts:62-74` |
| R-17 | HIGH | Mid-build failure leaves half-populated `[GENERATED]/<plugin>/` dir; no temp-dir staging, no rollback; with `--no-clean` it persists indefinitely | P3§1a | `BuildManager.ts:142-181,733-752` |
| R-18 | HIGH | File deletions break watcher: `FileManager.files` not updated on `unlink` → next rebuild `fs.copyFile`s a vanished path → ENOENT; deleted source files leak stale dist outputs forever | P3§2 | `src/scripts/build.ts:307-342`, `BuildManager.ts:733-752` |
| R-19 | HIGH | Plugin folder rename/delete/add unsupported at runtime — requires watcher restart | P3§2 | `src/scripts/build.ts:307-336` |
| R-20 | HIGH | Editing `plugin.json` doesn't refresh in-memory `plugin.manifest`; rebuild emits `fxmanifest.lua` from stale data | P1§7, P3§2 | `BuildManager.ts:963`, `FileManager.ts:434-435` |
| R-21 | HIGH | Inline base64 sourcemaps with `sourcesContent` ship to FiveM clients via `client/*.js` IIFEs → full TypeScript source exfil to every connecting player | P4§5, P5§3 | `BuildManager.ts:356,468` |
| R-22 | HIGH | `dotenv` bundled into in-game `core` server; relies on env-process inheritance, opens the door for accidental `.env` resolution from resource cwd | P4§5 | `src/plugins/[default]/core/server/index.ts:2` |
| R-23 | HIGH | API key transmitted in plaintext HTTP by default (`useHttps = false`); reload-endpoint code path reused for any non-localhost deploy | P4§1 | `src/scripts/managers/PluginReloadManager.ts:75-77,229` |
| R-24 | HIGH | FXServer binaries downloaded via `curl -L` over HTTPS with no checksum/signature; supply-chain compromise = native code as root in container | P4§6 | `Dockerfile:11-23` |
| R-25 | HIGH | Container runs as root; build tools (`git`, `curl`, `tar`, `xz-utils`) left in runtime image; no multi-stage; Ubuntu 20.04 (EOL April 2025) | P4§6, P5§7 | `Dockerfile` |
| R-26 | HIGH | `BINARIES_ARCHIVE_URL` build-default (`14482`) and `.env.example` (`13890`) disagree; `@citizenfx/server` types pinned to 14482; runtime/types skew possible | P0§4, P4§6 | `Dockerfile:12`, `.env.example:28`, `package.json` |
| R-27 | HIGH | Server-side `'character-create:save'` NetEvent has zero payload validation; trusts client-supplied `CharacterData`; future DB wiring inherits this | P4§4 | `src/plugins/[character]/[auth]/character-create/server/index.ts:33-58` |
| R-28 | HIGH | NUI callbacks have no input validation; `update-model` accepts arbitrary string into `SetPlayerModel`, `update-appearance` uses untrusted key for object indexing (proto-pollution risk) | P4§3, P2§6 | `src/plugins/[character]/[auth]/character-create/client/events.ts:57-242` |
| R-29 | HIGH | NUI/NetEvent strings duplicated as literals between sender/receiver, no shared registry, no discriminated union for action→payload; `cb: (data: any) => void` everywhere | P2§4, P2§6 | `client/events.ts`, `html/Page.tsx`, `client/ui.ts`, `shared/types.ts` |
| R-30 | HIGH | `PluginReloadManager.makeRequest` returns `Promise<any>`; three callers read fields without narrowing; "✓ Reloaded" surfaces on responses missing `success` | P2§8, P3§4 | `PluginReloadManager.ts:113-275` |
| R-31 | HIGH | `ManifestManager` and `PluginManager` are unreachable code (~500 LoC); duplicate manifest parsing logic that drifts silently from `FileManager` | P0§2, P1§7 | `src/scripts/managers/ManifestManager.ts`, `src/scripts/managers/PluginManager.ts` |
| R-32 | HIGH | Auto-reload watcher in `[default]/core` polls `dist/` — a path the build never writes to (writes go to `txData/.../[GENERATED]/`); half the hot-reload mechanism is dead | P0§2, P6§6 | `src/plugins/[default]/core/server/index.ts:17` |
| R-33 | HIGH | Three log surfaces, only `PluginBuilder`'s honors `--log-level`; `BuildManager` and `FileManager` use bare `console.*`; `FileManager.escapeGlobPattern` debug-prints unconditionally; error-wrap pattern drops `error.cause` | P1§7, P3§6 | `BuildManager.ts` (60+ sites), `FileManager.ts` (20+ sites) |
| R-34 | HIGH | `--no-clean` accumulates orphaned outputs (renamed plugins, deleted source files, removed plugins); no orphan-detection sweep | P3§3 | `BuildManager.ts:867-891`, `build.ts:120-124` |
| R-35 | HIGH | Windows file-locks cause `pnpm build` to abort on `clean()` with EBUSY/EPERM when FXServer is running; no retry, no coordination | P3§1e | `BuildManager.ts:867-891,733-752` |
| R-36 | HIGH | `minify: false` for production builds; `sourcemap: 'inline'` doubles client-bundle size; no env-aware switch | P5§3 | `BuildManager.ts:355,356,467,468` |
| R-37 | HIGH | esbuild + Vite recreated per file change in watch; no `esbuild.context().rebuild()`, no Vite JS-API reuse; 1-byte tweak triggers full plugin rebuild including `npx vite build` cold start | P5§3, P5§6 | `BuildManager.ts:323-385,630-651`, `build.ts:220-303` |
| R-38 | HIGH | 226 KB CSS + 233 KB vendor bytes-identical across 3 plugins (no shared resource); 466 KB per stub plugin for empty `<div>` | P5§4 | `BuildManager.ts:541-547`, `src/webview/main.tsx`, Vite output |
| R-39 | HIGH | Three React perf anti-patterns in `character-create`: `CharacterDataProvider.contextValue` recreated each render; `ClothingGrid` allocates fresh `Array.from` per render; `useInfiniteScroll` artificial `setTimeout(50)` | P5§10 | `html/context/CharacterDataContext.tsx:421-436`, `html/components/tabs/ClothingTab/ClothingGrid.tsx:24`, `html/hooks/useInfiniteScroll.ts:37-43` |
| R-40 | HIGH | Five env vars documented in `.env.example` but never read (`RELOADER_HOST`, `RELOADER_PORT`, `RELOADER_USE_HTTPS`, `DEBOUNCE_TIME`, `RESOURCE_DEBOUNCE_TIME`, `WEBVIEW_DEBOUNCE_TIME`); `BuildManager.initializeReloadManager` called with `{}` | P0§6, P1§7 | `build.ts`, `BuildManager.ts:96`, `.env.example` |
| R-41 | HIGH | `SERVER_NAME` has no validation in `build.ts`; if unset, output goes to `txData/undefined/...` silently | P0§6, P6§8 | `src/scripts/build.ts:66` |
| R-42 | HIGH | Wildcard CORS (`*`) on privileged reload endpoint compounds R-01 — any web page the operator visits can attempt `restartallresources` | P1§6, P4§1 | `src/plugins/[default]/core/server/index.ts:182` |
| R-43 | HIGH | `lodash` (HIGH advisory: code injection via `_.template`) in deps but unused; `esbuild-wasm`, `fs-extra`, `glob-promise`, `image-js`, `rimraf` also unused; `autoprefixer`/`postcss` duplicated in deps + devDeps | P0§4, P4§8 | `package.json` |
| R-44 | HIGH | Zero automated tests, zero CI, no typecheck-in-CI; build correctness has no automated guard | P6§1, P6§2 | repo-wide |
| R-45 | HIGH | `LICENSE` file missing despite `package.json` declaring `"license": "ISC"` and README claiming "see the LICENSE file" | P6§5 | repo root |
| R-46 | HIGH | Onboarding has 7+ undocumented blockers: companion reload resource is `[default]/core` itself, missing `server.cfg`, missing `fivem-binaries/`, BINARIES_ARCHIVE_URL build mismatch, MariaDB schema not seeded, `ensure <plugin>` discoverability, leaked `App.tsx` artifact | P6§5, P6§6 | `README.md`, `docker-compose.yml`, `.env.example` |
| R-47 | HIGH | No `docker-compose` healthchecks; `db` and `fivem` race at startup; no FiveM readiness probe; logs uncapped (no `logging:` block) | P6§3, P6§4 | `docker-compose.yml`, `Dockerfile` |
| R-48 | HIGH | No ESLint, Prettier, EditorConfig, or pre-commit hook; one stale `eslint-disable-next-line` in repo proves intent never landed | P6§10 | repo root |
| R-49 | HIGH | Asset-server has no auth, sync `fs.existsSync` per request, deprecated `X-XSS-Protection` header, no rate limit, public CORS | P4§10, P5§8 | `asset-server/server.js` |
| R-50 | HIGH | `BuildManager` writes to disk via `fs/promises`, bypassing `FileManager`; mutable `Plugin.manifest` is the integration contract; no event when manifest changes | P1§7 | `BuildManager.ts:578,606,723,750,977,981`, `FileManager.ts` |

Severity disagreements: P1§6 marks "wildcard CORS" as LOW; P4§1 elevates to HIGH due to interaction with R-01. R-42 takes HIGH.

---

## 3. Remediation plan

### Phase A — Must-fix before prod

Security CRITICAL/HIGH, build correctness bugs, anything that can corrupt state or leak secrets.

**A-1 — Rotate credentials, lock down endpoints, bind localhost.** [R-01, R-02, R-23, R-42, R-26]
- Effort: **S**
- Files: `.env.example`, `.env`, `docker-compose.yml`, `src/plugins/[default]/core/server/index.ts`, `Dockerfile`
- Depends on: none
- Sketch: Rotate `MYSQL_ROOT_PASSWORD`/`MYSQL_PASSWORD`. Replace `.env.example` with `<replace-me>` placeholders that the in-game server refuses at startup. `server.listen(PORT, '127.0.0.1')`. Bind compose ports `127.0.0.1:3414:3414` and drop `3306:3306` entirely (services reach DB via internal Docker DNS). Drop CORS or restrict to `null`/`http://localhost:*`. Add `crypto.timingSafeEqual` after equal-length check. Reconcile `BINARIES_ARCHIVE_URL` between `Dockerfile` default and `.env.example`. Force fail-fast on placeholder API key. Force `MYSQL_USER` ≠ `root`. Consider `git filter-repo` for the secrets if the repo has external readers — out of scope for the PR but call it out in the PR body.

**A-2 — Asset-server traversal + minimum hardening.** [R-03, R-49]
- Effort: **S**
- Files: `asset-server/server.js`
- Depends on: none
- Sketch: Replace each `path.join(publicDir, quality, assetPath)` + `fs.existsSync` + `res.sendFile(filePath)` with `res.sendFile(assetPath, { root: path.join(publicDir, quality), dotfiles: 'deny' })`. Bind `127.0.0.1` unless an env flag explicitly opts in. Drop deprecated `X-XSS-Protection`. Replace sync `fs.existsSync` with the implicit 404 `sendFile` produces. Add a shared-secret token middleware as a stub for §1's later auth.

**A-3 — Drop client-side inline sourcemaps; remove `dotenv` from in-game server.** [R-21, R-22]
- Effort: **S**
- Files: `BuildManager.ts`, `src/plugins/[default]/core/server/index.ts`
- Depends on: none
- Sketch: `sourcemap: isServerScript ? 'inline' : false` (or honor a `--prod` flag — see B-9). For the in-game server, replace `process.env.RELOADER_API_KEY` with `GetConvar('reloader_api_key', '')` and delete the `import 'dotenv/config'` line; FXServer's `setr`/convar mechanism is the right surface. Rotate the artifact (the `dotenv` bundle leaks pnpm path layout via sourcemap).

**A-4 — Manifest validation: wire `src/utils/schema.json` through ajv; fail fast.** [R-08, R-07]
- Effort: **M**
- Files: `FileManager.ts`, `BuildManager.ts`, `src/utils/schema.json`, `src/scripts/types/Manifest.ts`
- Depends on: none
- Sketch: Load schema once at `FileManager` startup; validate every `plugin.json` with ajv before populating `plugin.manifest`. Treat parse/validation failure as fatal *for that plugin only* — record `success: false` so summary surfaces it. Generate `PluginManifest` interface from the schema (`json-schema-to-typescript`) so the index signature `[key: string]: any` goes away. In `BuildManager.generateFxManifest`, type-aware emit for booleans (`'yes'/'no'` or unquoted), numbers (unquoted), and refuse objects with a clear error. Honor `config` and emit `name`. Validate custom-property keys against `/^[a-z_][a-z0-9_]*$/i`.

**A-5 — Server-side input validation at the `onNet` boundary.** [R-27, R-28]
- Effort: **S**
- Files: `src/plugins/[character]/[auth]/character-create/server/index.ts`, `client/events.ts`, `shared/types.ts`
- Depends on: A-4 (depends on `zod` or `ajv` already being a dep — share the validator)
- Sketch: Add zod schemas for `CharacterData`, `update-model`, `update-appearance` (allowlist `category` against `keyof AppearanceData`), and the rest. Validate at every `onNet` and `RegisterNuiCallback` entry. Reject with `cb({ status: 'invalid' })` or by skipping the server work + audit-logging the source.

**A-6 — Reload protocol correctness: timeouts, await `StartResource`, no permanent disable.** [R-14, R-15, R-16, R-30]
- Effort: **S**
- Files: `src/plugins/[default]/core/server/index.ts`, `PluginReloadManager.ts`
- Depends on: A-1 (key fixed first)
- Sketch: `req.setTimeout(5000, () => req.destroy(...))` on every client request. On the server side, wrap the 500ms `setTimeout` in a Promise and `await` it before responding; surface `StartResource` failures in the response. Replace `Promise<any>` on `makeRequest` with `Promise<unknown>` plus a per-route runtime narrower (zod). On `initialize()` failure, leave `reloadManager` alive but mark unhealthy; retry probe on next call.

**A-7 — Transactional plugin builds: temp-dir + atomic rename.** [R-17, R-34, R-35]
- Effort: **M**
- Files: `BuildManager.ts`
- Depends on: none
- Sketch: Build each plugin into `<destDir>.tmp.<pid>`, atomically rename to `<destDir>` on success, `rm -rf` on failure. Eliminates half-populated dirs on mid-build crashes and addresses Windows EBUSY in part (the rename is the only contended step). For `--no-clean`, add an orphan-sweep that deletes `[GENERATED]/<dirs>` without a matching source plugin. Document Windows lock behavior; out of scope to coordinate with FXServer's resource scan.

**A-8 — Docker hardening + healthchecks.** [R-24, R-25, R-47]
- Effort: **S**
- Files: `Dockerfile`, `docker-compose.yml`
- Depends on: A-1 (port-bind change lives in the same file)
- Sketch: Multi-stage Dockerfile (`fetch` stage → final). Bump base to `ubuntu:24.04` or `debian:12-slim`. `sha256sum -c` the FXServer tarball against a checksum committed in repo. `--proto =https --tlsv1.2 --fail-with-body` on curl. `USER fivem` for runtime. Add `HEALTHCHECK CMD curl -f http://localhost:40120/`. In compose: `healthcheck` on `db:` (`mysqladmin ping`); `depends_on: { db: { condition: service_healthy } }` on `fivem:`; `logging: { driver: json-file, options: { max-size: 10m, max-file: 5 } }` on both. Bump `mariadb:10.5` → `mariadb:11.4`.

**A-9 — Add `LICENSE` file; fix `SERVER_NAME` fail-fast.** [R-45, R-41]
- Effort: **S**
- Files: `LICENSE` (new), `src/scripts/build.ts`
- Depends on: none
- Sketch: Add ISC license text matching `package.json:17`. At top of `main()`, refuse to start if `process.env.SERVER_NAME` is unset/empty — clear error + exit 1. Same for `RELOADER_API_KEY` placeholder (shared with A-1).

### Phase B — High-leverage cleanup

Architecture improvements with strong ROI, parallelization, type-safety hardening, build-system test coverage.

**B-1 — Eliminate `App.tsx` swap: per-plugin Vite entry / virtual module.** [R-06]
- Effort: **M**
- Files: `BuildManager.ts`, `src/webview/`, `vite.config.ts`, `src/webview/App.tsx` (delete + gitignore)
- Depends on: none
- Sketch: Generate a per-plugin entry file in the plugin's dist (or use a Vite virtual module keyed by plugin name) so `src/webview/App.tsx` is no longer mutated. `.gitignore` `src/webview/App.tsx`. Delete `ensureWebviewFiles` (a no-op self-copy). Once the swap is gone, `Promise.all` cross-plugin webview builds — empirical 5.5+ s win on cold build.

**B-2 — Drive bundling from `plugin.json` entry points; kill dead IIFEs.** [R-04, R-12]
- Effort: **M**
- Files: `BuildManager.ts`, `FileManager.ts`
- Depends on: A-4 (validated manifest is the source of truth)
- Sketch: `buildPluginTs`/`buildPluginJs` consume `client_scripts`/`server_scripts`/`shared_scripts` glob patterns from the manifest as entry points instead of `plugin.files.filter(...endsWith('.ts'))`. `shared/` is no longer emitted standalone; only inlined through declared entries. Path-segment platform detection (immediate parent under plugin root must be `server`/`client`/`shared`) replaces the `path.includes('/server/')` substring. Drops ~31 MB of dead disk per `character-create` build.

**B-3 — Stub-skip for empty `Page.tsx`.** [R-05]
- Effort: **S**
- Files: `BuildManager.ts`
- Depends on: B-1 (cleaner integration; can ship before too)
- Sketch: In `buildPluginPageTsx`, esbuild-transform `Page.tsx` once and inspect the AST: if the export is structurally `<div></div>` (or otherwise has no JSX children), skip the Vite build and emit a tiny stub `index.html`. Removes 5.8 s from the cold build.

**B-4 — Watcher correctness: deletes, renames, plugin.json reload.** [R-18, R-19, R-20]
- Effort: **M**
- Files: `src/scripts/build.ts`, `FileManager.ts`, `BuildManager.ts`
- Depends on: A-7 (per-plugin temp-dir build for clean-rebuild semantics)
- Sketch: chokidar `unlink` + `unlinkDir` update `FileManager.files`/`plugins` and remove the corresponding dist file. Plugin folder rename = old `plugin.json` unlinks + new `plugin.json` adds → re-scan. New plugin at runtime: detect a `plugin.json` add that doesn't match any registered plugin → `fileManager.refresh()` then build. `plugin.json` change → `fileManager.reloadPlugin(...)` (the existing method) before triggering rebuild. Route file change by kind (TS-server / TS-client / Page.tsx / asset) so a 1-byte client edit doesn't run Vite.

**B-5 — tsconfig hygiene: types whitelist + client/server split + scripts composite or out.** [R-09, R-10, R-11]
- Effort: **M**
- Files: `tsconfig.json`, `tsconfig.scripts.json`, `tsconfig.plugins.json` → split into `tsconfig.plugins.client.json` + `tsconfig.plugins.server.json`, `tsconfig.webview.json`
- Depends on: none
- Sketch: Add `"types": [...]` whitelist on every project — webview gets `["vite/client"]`; plugin client gets `["@citizenfx/client"]`; plugin server gets `["@citizenfx/server", "node"]`; scripts gets `["node"]`. Either restore `composite: true` on scripts or drop it from `references`. Remove `**/shared/**/*` overlap from plugins; either move shared files to a top-level `src/shared/` with its own tsconfig or add to plugins exclude.

**B-6 — Typed NUI/NetEvent registry.** [R-29]
- Effort: **M**
- Files: `shared/types.ts`, `client/events.ts`, `client/ui.ts`, `html/components/**`, `html/Page.tsx`, `webview/utils/fetchNui.ts`, `webview/hooks/useNuiEvent.ts`
- Depends on: B-5 (types whitelist), A-5 (validation surface ready)
- Sketch: Define `NuiCallbackMap` + `NetEventMap` keyed by string action → `{ request; response }`. Generic `fetchNui<K extends keyof NuiCallbackMap>(action: K, data: NuiCallbackMap[K]['request']): Promise<NuiCallbackMap[K]['response']>`. Typed `registerCallback<K>(action: K, handler: (data, cb) => void)`. Replace `cb: (data: any) => void` with discriminated `NuiResponse`. Compile-time check binds payloads to action strings and removes the 13 `as NuiCallback<...>` casts.

**B-7 — Unified `Logger`; drop `console.*` in managers; preserve `error.cause`.** [R-33]
- Effort: **S**
- Files: `BuildManager.ts`, `FileManager.ts`, `PluginReloadManager.ts`, `build.ts`, new `src/scripts/Logger.ts`
- Depends on: none
- Sketch: Single `Logger` interface injected through constructors, level-aware. Replace every `console.*` call. Replace the `new Error(\`Failed to X: ${msg}\`)` pattern with `new Error('Failed to X', { cause: error })` so root cause is recoverable. Delete the unconditional debug prints in `FileManager.escapeGlobPattern`. esbuild errors formatted via `esbuild.formatMessages` (see R-from P6§8b).

**B-8 — Reuse esbuild contexts + Vite JS API in watch.** [R-37]
- Effort: **M**
- Files: `BuildManager.ts`, `build.ts`
- Depends on: B-1 (no App.tsx swap means Vite can be reused), B-4 (file-kind routing)
- Sketch: For each TS entry, hold an `esbuild.context()` and call `ctx.rebuild()` on change. For Vite, switch from `npx vite build` subprocess to JS API (`createBuilder`/`build`) so dep-prebundle stays warm across plugins and across rebuilds. Drives watch latency from ~7 s to <1 s for typical edits.

**B-9 — Production build flag: minify + external sourcemaps + shared vendor/CSS.** [R-36, R-38]
- Effort: **M**
- Files: `BuildManager.ts`, `vite.config.ts`, `src/webview/main.tsx`, `src/webview/i18n.ts`
- Depends on: B-1, B-2 (right surface to add the flag)
- Sketch: `--prod`/`NODE_ENV=production` flips `minify: true`, switches sourcemaps to external `.map` siblings (not in manifest's `client_scripts`), and emits a single shared `vendor` + Tailwind CSS to a stable URL referenced by every plugin's `index.html`. Trim Tailwind safelist to active palettes (`indigo`/`zinc`). Lazy-load `i18n.ts` per locale or strip it until plugins use `useTranslation`. Cuts every plugin's webview payload roughly in half.

**B-10 — React perf patches (3 spots).** [R-39]
- Effort: **S**
- Files: `html/context/CharacterDataContext.tsx`, `html/components/tabs/ClothingTab/ClothingGrid.tsx`, `html/hooks/useInfiniteScroll.ts`
- Depends on: none
- Sketch: `useMemo` the provider value or split state/dispatch contexts. `useMemo` the `Array.from({length: maxItems}, ...)` keyed by `category.maxItems`. Delete the artificial `setTimeout(50)` in `useInfiniteScroll`.

**B-11 — Tests + CI.** [R-44]
- Effort: **M**
- Files: `tests/`, `vitest.config.ts`, `.github/workflows/ci.yml`, `package.json`
- Depends on: A-4, A-7, B-2 (the things to test exist in their final shape)
- Sketch: Add `vitest`. Five tests from P6§1: manifest snapshot, server/client routing table, reload protocol stub, watcher debounce, App.tsx restoration (the last one tests B-1 didn't regress). GitHub Actions: pnpm install + `tsc -b` + `SERVER_NAME=ci-stub pnpm build` + `pnpm test`.

**B-12 — Plumb env vars; fix `--no-clean` orphan-sweep.** [R-40, R-34]
- Effort: **S**
- Files: `build.ts`, `BuildManager.ts`, `.env.example`
- Depends on: A-7
- Sketch: Read `RELOADER_HOST`/`RELOADER_PORT`/`RELOADER_USE_HTTPS`/`DEBOUNCE_TIME`/`RESOURCE_DEBOUNCE_TIME`/`WEBVIEW_DEBOUNCE_TIME` in `BuildManager.initializeReloadManager` and the watcher's debounce timer. Or remove the unread vars from `.env.example`. Add the orphan-sweep noted in A-7.

### Phase C — Polish

NITs, docs, DX, lint config, asset cleanup.

**C-1 — Prune unused deps; consolidate dep duplication.** [R-43]
- Effort: **S**
- Files: `package.json`, `pnpm-lock.yaml`
- Depends on: none
- Sketch: Drop `lodash`, `esbuild-wasm`, `fs-extra`, `glob-promise`, `image-js`, `rimraf`, `lodash.debounce` (watcher uses manual setTimeout). Move `autoprefixer`/`postcss` into devDeps only. Move `@types/fs-extra` to devDeps (after fs-extra removed, this also goes). Clears most of the pnpm audit advisory list.

**C-2 — Path aliases (`@webview/*`, `@shared/*`).** [P0§1, P1§4]
- Effort: **S**
- Files: `tsconfig.*.json`, `vite.config.ts`, plugin html files
- Depends on: B-5
- Sketch: Define `@webview/*` and `@shared/*` paths in tsconfig and Vite resolve.alias. Replace 5–7 segment `..` imports across `character-create/html/**`. Cosmetic but unblocks bracket-folder reorganization.

**C-3 — README accuracy + CONTRIBUTING + sample `server.cfg`.** [R-46, P6§5]
- Effort: **M**
- Files: `README.md`, `CONTRIBUTING.md` (new), `txData/.../server.cfg.example` (new)
- Depends on: A-1, A-9
- Sketch: Document hot-reload requires `ensure core` in `server.cfg`. Document `SERVER_NAME` is required for build. Reconcile `BINARIES_ARCHIVE_URL` examples. Replace `ts-node` reference in `build.ts` print-help with `tsx`. Add a "first run" walkthrough that gets a contributor from clone to running FXServer. Document the asset-server two-package-manager arrangement explicitly. Sample `server.cfg` showing each plugin's `ensure` line and convar setup.

**C-4 — Lint + format + EditorConfig.** [R-48]
- Effort: **S**
- Files: `eslint.config.mjs`, `.prettierrc`, `.editorconfig`, `package.json`, CI workflow
- Depends on: B-11 (CI exists)
- Sketch: Flat ESLint config with `@typescript-eslint`, `react`, `react-hooks`. Prettier (single-quote, semi, 2-space). EditorConfig matching. `pnpm lint` + `pnpm format` + CI step. Skip Husky for now.

**C-5 — Dead-code cleanup.** [R-31, R-32, P0§2]
- Effort: **S**
- Files: delete `src/scripts/managers/ManifestManager.ts`, `src/scripts/managers/PluginManager.ts`; rewrite or delete the dead file-watcher in `[default]/core/server/index.ts`; delete `pages/ComponentsExamples.tsx` if unreferenced; consolidate scrollbar utility duplication
- Depends on: none
- Sketch: ~500 LoC deletion. Watcher in core: if file-watch is wanted, point at the actual `[GENERATED]/` resources tree; otherwise delete and rely on the HTTP endpoint exclusively.

**C-6 — Plugin `package.json` for workspace integration; consolidate package managers.** [P6§9]
- Effort: **S**
- Files: per-plugin `package.json`, `pnpm-workspace.yaml`, `package.json`, `asset-server/package.json`, `asset-server/package-lock.json` (delete)
- Depends on: B-11 (CI to catch regressions)
- Sketch: Add `asset-server` to `pnpm-workspace.yaml`. Replace `pnpm start:assets` with `pnpm --filter asset-server start`. Optional: add `package.json` to each plugin matching its `plugin.json` `name`/`version` to make `pnpm --filter <plugin>` work.

---

## 4. Proposed PR sequence

Each shippable independently, ordered to unblock dependent work, sized under ~400 line diff.

```
PR 01: Lock down secrets & endpoints (ports, API key, CORS, compose)
  Phase: A | Effort: S | Risk-IDs covered: R-01, R-02, R-23, R-26, R-42, R-41, R-45
  Unblocks: PR 02, PR 04
  Sketch: Replace `.env.example` with placeholders that the in-game server refuses at
    startup. Bind `core` HTTP to `127.0.0.1`, drop CORS (or restrict). Constant-time
    auth compare. Add timing-safe rejection for placeholder. Bind compose ports to
    localhost; drop public `3306` publish. Reconcile BINARIES_ARCHIVE_URL between
    Dockerfile and .env.example. Add LICENSE (ISC). Add SERVER_NAME fail-fast in
    build.ts. Note in PR body if history rewrite is being considered separately.

PR 02: Asset-server traversal fix + bind localhost
  Phase: A | Effort: S | Risk-IDs covered: R-03, R-49
  Unblocks: —
  Sketch: Replace per-route path.join + sendFile with sendFile({ root, dotfiles: 'deny' }).
    Bind 127.0.0.1 unless ASSET_SERVER_HOST is set. Add a stub shared-secret
    middleware. Drop X-XSS-Protection. Replace sync existsSync with sendFile's 404.

PR 03: Drop client-side inline sourcemaps; remove dotenv from in-game server
  Phase: A | Effort: S | Risk-IDs covered: R-21, R-22
  Unblocks: PR 09
  Sketch: BuildManager: sourcemap is `'inline'` only when isServerScript. core/server
    reads RELOADER_API_KEY via GetConvar, drops `import 'dotenv/config'`. Verify
    bundle size drops on rebuild.

PR 04: Manifest validation via ajv + typed fxmanifest emit
  Phase: A | Effort: M | Risk-IDs covered: R-07, R-08
  Unblocks: PR 05, PR 06, PR 11
  Sketch: Wire src/utils/schema.json through ajv at FileManager startup. Generate
    PluginManifest from schema. Fail fast on parse/validate errors per plugin (record
    success: false). Type-aware emission for booleans/numbers; reject objects with
    a clear error. Honor `config`. Validate custom-property keys.

PR 05: NUI + NetEvent input validation at boundaries
  Phase: A | Effort: S | Risk-IDs covered: R-27, R-28
  Unblocks: PR 10
  Sketch: Add zod (or share ajv from PR 04) for CharacterData and the 12 NUI actions.
    Allowlist `update-appearance` category against keyof AppearanceData. Reject
    invalid payloads via cb({ status: 'invalid' }) and audit-log on the server side.

PR 06: Reload protocol correctness — timeouts, await StartResource, retry probe
  Phase: A | Effort: S | Risk-IDs covered: R-14, R-15, R-16, R-30
  Unblocks: —
  Sketch: req.setTimeout(5000) on every client request. Wrap server-side
    setTimeout(StartResource, 500) in a Promise and await before responding. Surface
    StartResource errors. makeRequest returns Promise<unknown> with per-route zod
    narrower. initialize() failure leaves manager unhealthy but retryable.

PR 07: Transactional plugin builds (temp-dir + atomic rename) + orphan sweep
  Phase: A | Effort: M | Risk-IDs covered: R-17, R-34, R-35
  Unblocks: PR 08
  Sketch: BuildManager builds into <destDir>.tmp.<pid>; rename on success; rm on
    failure. Add orphan-sweep that deletes [GENERATED]/<dirs> without a matching
    plugin. Document Windows lock behavior.

PR 08: Docker multi-stage + healthchecks + log rotation + base bumps
  Phase: A | Effort: S | Risk-IDs covered: R-24, R-25, R-47
  Unblocks: —
  Sketch: Multi-stage Dockerfile (fetch + final). Bump to ubuntu:24.04 (or
    debian:12-slim). sha256 verify the FXServer tarball. USER fivem at runtime.
    HEALTHCHECK in Dockerfile. Compose: db healthcheck, depends_on condition,
    json-file logging caps. Bump mariadb to 11.4. Verify tarball checksum is
    committed and refreshed when URL bumps.

PR 09: Eliminate App.tsx swap (per-plugin Vite entry) + parallelize webview builds
  Phase: A/B | Effort: M | Risk-IDs covered: R-06
  Unblocks: PR 10, PR 12, PR 13
  Sketch: Remove src/webview/App.tsx mutation. Generate per-plugin entry under
    plugin dist (or use a Vite virtual module). .gitignore the file. Delete
    ensureWebviewFiles. Promise.all over plugin webview builds. Verify no
    determinism regression.

PR 10: Drive bundling from plugin.json + path-segment platform detection +
       skip stub Page.tsx
  Phase: B | Effort: M | Risk-IDs covered: R-04, R-05, R-12, R-13
  Unblocks: PR 12
  Sketch: buildPluginTs/Js consume client_scripts/server_scripts/shared_scripts
    glob patterns from manifest. Path-segment match for platform routing
    (immediate parent under plugin root). esbuild externals: `[/^node:/, ...builtinModules]`.
    AST-skip empty Page.tsx in buildPluginPageTsx (or just byte-compare to known stub).

PR 11: Watcher correctness — deletes/renames/plugin.json reload + file-kind routing
  Phase: B | Effort: M | Risk-IDs covered: R-18, R-19, R-20
  Unblocks: PR 13
  Sketch: chokidar unlink/unlinkDir update FileManager.files/plugins. plugin.json
    change reloads manifest before rebuild. Unmatched plugin.json add triggers
    refresh + build. Route file change by kind so a client TS edit doesn't run Vite.

PR 12: Production build flag + shared vendor/CSS + Tailwind safelist trim
  Phase: B | Effort: M | Risk-IDs covered: R-36, R-38
  Unblocks: —
  Sketch: --prod flag flips minify + external sourcemaps. Single shared vendor
    bundle + Tailwind CSS at stable path; plugin index.html references them.
    Trim safelist to active palettes. Lazy-load i18n.

PR 13: Reuse esbuild contexts + Vite JS API across watch rebuilds
  Phase: B | Effort: M | Risk-IDs covered: R-37
  Unblocks: —
  Sketch: Hold esbuild.context() per entry across the watch session. Switch
    Vite from npx subprocess to JS API. Verify watch latency < 1 s for typical
    edits via informal benchmark in PR body.

PR 14: tsconfig hygiene — types whitelist, client/server split, scripts composite
  Phase: B | Effort: M | Risk-IDs covered: R-09, R-10, R-11
  Unblocks: PR 15
  Sketch: Split plugins tsconfig into client/server. Add `types: [...]` to every
    project. Decide on tsconfig.scripts.json (composite or out of references).
    Resolve shared/** overlap. Make sure `tsc -b` from root succeeds.

PR 15: Typed NUI + NetEvent registry; remove `as NuiCallback<...>` casts
  Phase: B | Effort: M | Risk-IDs covered: R-29
  Unblocks: —
  Sketch: NuiCallbackMap + NetEventMap in shared/types.ts. Generic fetchNui +
    registerCallback. Discriminated NuiResponse. Update 13 call sites in
    client/events.ts.

PR 16: Unified Logger + error.cause + drop console.* in managers
  Phase: B | Effort: S | Risk-IDs covered: R-33
  Unblocks: —
  Sketch: Logger interface injected through constructors. Replace ~80 console.*
    calls. error.cause everywhere. Format esbuild errors via esbuild.formatMessages.
    Delete unconditional debug prints in FileManager.escapeGlobPattern.

PR 17: Tests + CI
  Phase: B | Effort: M | Risk-IDs covered: R-44
  Unblocks: PR 18
  Sketch: vitest config. Five tests from P6§1: manifest snapshot, server/client
    routing table, reload protocol stub, watcher debounce, App.tsx restoration
    (regression for PR 09). GitHub Actions: install + tsc -b + build + test.

PR 18: Polish — prune deps, lint config, README rewrite, dead code, React perf
  Phase: C | Effort: M | Risk-IDs covered: R-43, R-31, R-32, R-39, R-40, R-46, R-48
  Unblocks: —
  Sketch: Drop unused deps (lodash, esbuild-wasm, fs-extra, etc.). ESLint flat
    config + Prettier + .editorconfig + lint script in CI. Delete ManifestManager,
    PluginManager, dead core watcher. React perf patches (useMemo, kill setTimeout).
    Plumb the unread env vars (or remove from .env.example). README rewrite +
    CONTRIBUTING + sample server.cfg.
```

Sized notes: PR 04 (manifest validation) and PR 09 (App.tsx swap) are the largest in the sequence; both fit under 400 LoC if scoped to validation infrastructure (PR 04) and entry-file generation only (PR 09 — defer parallelization to a follow-up if it pushes over). PR 18 is intentionally a basket — split if reviewer prefers.

---

## 5. Out-of-scope but worth noting

- **Migrate `RELOADER_API_KEY` to a session token** scoped to the local FXServer process (rotated on each `pnpm dev` start); kills the static-secret problem entirely.
- **Drop `canvas` and `image-js` from root deps** if the asset-server's `sharp` is the only image processor in use; verify nothing in `[default]/core` server has a future plan to use canvas.
- **Generate a top-level `pnpm version-plugins` script** that bumps `plugin.json` version with conventional-commit input — `0.1.0` everywhere is a vestigial constant today.
- **Move asset-server image variants to WebP/AVIF + Brotli pre-compression**; significant client-bandwidth win once the asset-server is wired to a real catalog.
- **Replace bare `http`/`url.parse` modules in the in-game core server** with `URL` + `fetch` (Node 22 native) + a keep-alive Agent if reload volume grows.
- **Add a `setup:fxserver` script** that downloads + extracts the binary on Windows so `fivem-binaries/` doesn't need manual setup.
- **Consider a release-please-driven changelog** once conventional commits land via lint config.
- **Document NUI ↔ client and client ↔ server contracts** as a top-level `docs/PROTOCOLS.md` once PR 15 lands — the new typed registry is the right surface.
- **Plugin-level test fixtures** that build a synthetic plugin and snapshot every output (manifest, dist tree, sourcemap policy) — adds 2nd-order test coverage on top of unit tests.
- **Investigate whether txAdmin's `40120/tcp` UI is intentionally exposed** — `docker-compose.yml:11` publishes it without auth caveats in the README.

---

## 6. If I could only fix three things

These three are the highest-leverage changes in the audit. Any one of them is shippable in under a day; together they cover the credentials risk, the silent-corruption surface, and the largest architectural footgun in one weekend.

### 1. Rotate creds, lock down ports, refuse placeholder API key

```
chore(security): bind reload+db ports to localhost, refuse placeholder API key
```

Replaces `.env.example` secrets with `<replace-me>` placeholders that the in-game `core` server explicitly refuses at startup. Binds `core` HTTP to `127.0.0.1` and constant-time-compares the API key. Updates `docker-compose.yml` to publish `127.0.0.1:3414:3414` and drops the `3306:3306` publish (services reach DB via internal network). Adds the missing `LICENSE` file. Adds `SERVER_NAME` fail-fast at the top of `build.ts`. Rotates `MYSQL_ROOT_PASSWORD`/`MYSQL_PASSWORD` and notes in the PR body that history rewrite is being considered separately. Diff: ~200 lines across `.env.example`, `docker-compose.yml`, `src/plugins/[default]/core/server/index.ts`, `src/scripts/build.ts`, `LICENSE` (new). Single-source fix for R-01, R-02, R-23, R-26, R-41, R-42, R-45.

### 2. Validate `plugin.json` against `src/utils/schema.json`; fail fast

```
feat(build): validate plugin.json with ajv; fail fast on malformed manifests
```

Wires the existing-but-dead `src/utils/schema.json` through ajv at `FileManager` startup. Generates `PluginManifest` from the schema (`json-schema-to-typescript`) so the index signature `[key: string]: any` goes away. Treats parse/validation failure as fatal *for that plugin only* — recorded as `success: false` in the build summary. Type-aware fxmanifest emission: booleans → `key 'yes'/'no'`, numbers → unquoted, objects → explicit error (no more `'[object Object]'`). Honors `config`. Validates custom-property keys against an identifier regex. Eliminates the entire class of "invalid manifest builds successfully and emits garbage Lua" failures. Diff: ~300 lines across `FileManager.ts`, `BuildManager.ts`, `src/utils/schema.json`, generated `Manifest.ts`. Covers R-07, R-08; downstream fix surface for R-27 (server validation can share the schema).

### 3. Eliminate the `src/webview/App.tsx` swap with per-plugin Vite entries

```
refactor(build): per-plugin Vite entries; remove src/webview/App.tsx mutation
```

Replaces the global mutation of `src/webview/App.tsx` with a per-plugin entry file generated into the plugin's dist directory (or a Vite virtual module keyed by plugin name). `.gitignore`s `src/webview/App.tsx`. Deletes the no-op `ensureWebviewFiles` self-copy. Once the swap is gone, parallel cross-plugin webview builds become safe — empirical 5.5+ s win on cold build, ~37% reduction. The currently-leaked auto-generated stub disappears from git on the merge commit. Diff: ~250 lines across `BuildManager.ts`, `vite.config.ts`, `src/webview/App.tsx` (deleted), `src/webview/main.tsx`. Single-source fix for R-06; unblocks parallelization (B-1) and clean watch reuse (B-8).
