# P1 — Architecture & Boundaries

Read-only architecture audit of the U-Core build framework as of `master @ ffae3e5e` (2026-05-02). Severity tags follow CRITICAL / HIGH / MEDIUM / LOW / NIT. `[UNVERIFIED]` marks claims that would need a runtime check.

---

## 1. The `src/webview/App.tsx` swap

### Sequence (per plugin with a `Page.tsx`)

`BuildManager.buildPluginPageTsx` (BuildManager.ts:527-623):

1. `appFilePath = src/webview/App.tsx` (BuildManager.ts:569).
2. Read existing content into `originalAppContent` if the file exists; otherwise leave `originalAppContent = ''` (BuildManager.ts:570-573).
3. `try`: write a generated `App.tsx` that `import Page from '<rel-path>'` (BuildManager.ts:577-578, generator at 660-681).
4. Run `ensureWebviewFiles` (no-op when `main.tsx`/`index.html`/`index.css` already exist) (BuildManager.ts:584, 688-725).
5. `runViteBuild` shells out `npx vite build --outDir=<plugin-dist>/html` (BuildManager.ts:588, 630-651).
6. Verify `index.html` exists in output (BuildManager.ts:591-596).
7. `finally`: write `originalAppContent` back **only if it is truthy** (BuildManager.ts:603-608).

### Findings

- **HIGH — `App.tsx` is never restored when the file did not pre-exist.** BuildManager.ts:570-573 + 605. The `if (originalAppContent)` guard means an empty string skips the restore. After the first build, the auto-generated stub remains on disk; subsequent runs read *that* stub as "original" and faithfully restore it, locking in the leak. The repo currently demonstrates this — `src/webview/App.tsx:1-10` is a leaked artifact pointing at `[character]/[auth]/character-create/html/Page.tsx`. **Fix:** unconditionally write a sentinel `App.tsx` (or delete the file) in the finally block, and `.gitignore` it.

- **HIGH — Restoration is not crash-safe.** A `SIGINT` / `SIGKILL` / power loss between BuildManager.ts:578 (write generated) and BuildManager.ts:606 (restore) leaves the generated stub on disk. `process.on('SIGINT')` in `build.ts:586` only stops the watcher; it does not restore App.tsx. **Fix:** wrap the entire pipeline in a process-level guard that calls the restore on `exit`/`SIGINT`/`SIGTERM`, or — better — generate to a temp `App.<plugin>.tsx` and switch the entrypoint, never overwriting the canonical file.

- **HIGH — The swap is not safe under two concurrent processes.** Two `pnpm dev` terminals (or `pnpm dev` + `pnpm build`) write to the same `src/webview/App.tsx`. Interleaving `read1 → write1(stubA) → read2 → write2(stubB) → vite1 → vite2 → restore1(originalAppContent=preStubA) → restore2(originalAppContent=stubA)` ends with `stubA` on disk, and Vite-1 may have actually compiled stubB (since both vite processes share the file). Within a single process this is fine because `buildSinglePlugin` is awaited sequentially in build.ts:127 / build.ts:250. **Fix:** lockfile (`flock`/`proper-lockfile`) on `App.tsx`, or — again — eliminate the global mutation and use a per-build temp entry. Also worth refusing to start a second watcher when one is already attached.

- **MEDIUM — Vite invocation goes through `shell: true` with the output path interpolated into the command string.** BuildManager.ts:631-639. `outDir = txData/${SERVER_NAME}/resources/[GENERATED]/<parents>/<plugin>/html`. If `SERVER_NAME` or a plugin/parent folder ever contained shell metacharacters (space, `;`, `&`, `` ` ``, `$`), the spawn shells them. Plugin/folder names are dev-controlled, so the practical risk is low, but the pattern is wrong. **Fix:** `spawn('npx', ['vite', 'build', '--outDir', outputDir], { shell: false, stdio: 'inherit' })`.

- **LOW — Generated `App.tsx` is not formatted as a `.gitignore`-tagged sentinel.** It contains a wall-clock timestamp (BuildManager.ts:671), so even if the same plugin builds twice in a row, the file's bytes change, polluting `git status`. **Fix:** drop the timestamp and gitignore the file.

## 2. Sequential webview builds

### How they're sequenced

`buildPlugin` (BuildManager.ts:145) `await`s `buildPluginPageTsx`, which spawns a fresh `npx vite build` subprocess each call (BuildManager.ts:631-651). Plugins themselves are iterated sequentially in `PluginBuilder.buildAll` (build.ts:127) and `processRebuildQueue` (build.ts:250). There is no in-process Vite state — every plugin's webview build is a fresh `npx` cold start.

### Findings

- **HIGH — The cost is dominated by `npx vite build` cold-starts, not by Vite itself.** Each plugin pays: npx resolution, Vite config load, plugin-react setup, Tailwind initialization, esbuild dep-prebundle, Rollup pass, output write. Empirically each cold start is ~3-8 s; with 3 webview-bearing plugins (`character-create`, plus the two stub `character-select`/`character-edit`), `pnpm build` walks all of them sequentially. Two of those three are 3-line `<div></div>` placeholders (audit/00-inventory.md §1), so >60% of webview-build wall-clock is spent compiling stubs. **Fix:** (a) skip `buildPluginPageTsx` when the Page is structurally empty, or (b) drive Vite via the JS API once, varying the entry per plugin via a virtual module — eliminates the `App.tsx` swap entirely and lets builds parallelize.

- **MEDIUM — Sequencing is enforced by shared mutable state, not by intent.** The reason builds *must* be sequential is the global `src/webview/App.tsx` mutation, not any architectural constraint of Vite. Vite supports an `outDir` per build and would happily run N children in parallel given N entry files. **Fix:** see §1's recommendation — once each plugin has its own entry file (or virtual module), `Promise.all` over plugin webview builds is safe.

- **LOW — `ensureWebviewFiles` (BuildManager.ts:688-725) appears to be defensive copy logic for a layout that doesn't exist.** It looks for `main.tsx` / `index.html` / `index.css` in `srcDir = src/webview` and copies from `webviewSrcDir = src/webview` if missing — i.e., it copies a file from a directory onto itself. The `index.css` source path is wrong: `theme/index.css` is the actual stylesheet. The whole function is a no-op in current layout. **Fix:** delete.

## 3. Path-based server/client detection

### Where the rule lives

Single source: `BuildManager.isServerScript` (BuildManager.ts:911-913):

```
filePath.includes('/server/') || filePath.includes('\\server\\')
```

Used at:
- BuildManager.ts:336 (TS bundling — sets `platform`, externals, adds `canvas`)
- BuildManager.ts:454 (JS bundling — same)

That's it. There is no "client" rule (everything not-server is treated as browser) and no "shared" rule. `html/` files are detected separately via the same substring approach (BuildManager.ts:545-546) but only to find `Page.tsx`.

### Findings

- **HIGH — Every loose `.ts` under a plugin becomes its own bundle entry point.** BuildManager.ts:310-313 filters all `.ts` files (excluding `.tsx`); BuildManager.ts:323-385 then runs `esbuild.build` once per file. That means `shared/store.ts`, `shared/types.ts` are each built into their own IIFE bundle, *and* are inlined again into every client/server file that imports them. If you put a stray `.ts` file at the plugin root or in `html/utils/`, it gets bundled as a browser IIFE in the resource output regardless of whether the manifest references it. **Fix:** drive bundling from `client_scripts`/`server_scripts`/`shared_scripts` declared in `plugin.json` (entry points), not from a tree-walk.

- **HIGH — `shared/` files are misclassified.** A file at `<plugin>/shared/util.ts` has no `/server/` segment, so `isServerScript` returns `false`. The shared file is independently emitted as a browser IIFE (target: es2017, platform: browser, no Node externals). If the same module is imported by `server/index.ts`, esbuild *also* inlines it into the server bundle on the node platform. Currently safe by luck because `character-create/shared/{store,types}.ts` are pure JS data structures; a shared module that imports `node:crypto` would build twice (once as broken-browser, once as fine-server). **Fix:** treat `shared/` as the declared boundary — emit nothing for shared files directly; only inline them through entries.

- **MEDIUM — Substring match is path-position-agnostic.** Anything containing `/server/` is server, including a hypothetical `client/server-utils/foo.ts`, `html/components/server-icon.tsx`, or a ts file under a tooling cache like `.cache/server/...`. Documented as a known footgun in CLAUDE.md. **Fix:** check that the *immediate* parent under the plugin root is exactly `server` (or `client`/`shared`):
  ```
  const rel = path.relative(plugin.fullPath, file.fullPath);
  const root = rel.split(path.sep)[0];
  return root === 'server';
  ```

- **MEDIUM — Symlink / case-sensitivity surface area.** On Windows a directory named `Server/` resolves case-insensitively at the filesystem layer but the substring match is exact-lower-case. A file under `Server/index.ts` (note capital S) bundles as **browser** on Windows, then deploys to a Linux FXServer that cannot find it because the manifest pattern `server/*.js` is case-sensitive there. `[UNVERIFIED]` whether any plugin would ever end up with mixed-case folders, but the code allows it. Symlinks: `path.includes` operates on the resolved path, so a symlink crossing into a `server/` dir would correctly classify; a symlink *into* a `server/` dir from elsewhere would not. **Fix:** lowercase the path before substring compare, or — better — use the path-segment check from above.

- **MEDIUM — `getExternalPackages` (BuildManager.ts:921-942) is a hand-maintained allowlist of bare Node module names; modern code uses `node:` prefixes.** `import 'node:fs'` would not match `'fs'` in the externals list and esbuild would attempt to bundle it. Also missing: `os`, `path`, `worker_threads`, `perf_hooks`, `fs/promises` (literal subpath, distinct from `'fs'`), `process`, `assert`, and several others. **Fix:** `external: [/^node:/, ...builtinModules]` using `module.builtinModules`.

- **LOW — `canvas` is hard-wired as external for server scripts only (BuildManager.ts:359).** The reason isn't documented; `canvas` is browser-typed. If a plugin server script ever imports `sharp` or another native, this list grows unbounded. **Fix:** drive externals from a per-plugin `plugin.json` field or auto-detect from the lockfile.

## 4. Plugin → plugin coupling

### Import graph (verified by grep across `src/plugins/**`)

| From | To | Form |
|---|---|---|
| `[character]/[auth]/character-create/client/*.ts` | `../shared/{store,types}` | own plugin only |
| `[character]/[auth]/character-create/server/index.ts` | `../shared/types` | own plugin only |
| `[character]/[auth]/character-create/html/**/*.{ts,tsx}` | `../../../../../webview/{hooks,utils,components}/...` (5-7 levels of `..`) | framework |
| `[character]/[auth]/character-create/html/utils/getClothingImage.ts:172` | `../../shared/variations.json` | own plugin only |
| `[character]/[auth]/character-select/**` | (none) | — |
| `[character]/character-edit/**` | (none) | — |
| `[default]/core/server/index.ts` | (only npm + node built-ins) | — |
| `src/webview/App.tsx` | `../plugins/[character]/[auth]/character-create/html/Page.tsx` | **upward** (build artifact, see §1) |

### Findings

- **GOOD — No plugin-to-plugin imports exist today.** Verified by grep: the only line that crosses a plugin boundary is the leaked `src/webview/App.tsx:4` artifact, which points *into* a plugin from the framework root.

- **MEDIUM — The framework points into a specific plugin.** `src/webview/App.tsx:4` hardcodes `character-create`. Standalone `vite build` (without going through the BuildManager pipeline) will compile that plugin's UI as if it were the framework's UI. This is a directional cycle (framework → plugin → framework via `../webview/...`) that exists *only* because the build artifact leaked. **Fix:** see §1.

- **MEDIUM — Plugin → framework imports are deep relatives.** `../../../../../../webview/components/ui/Spinner` (six `..` segments) recurs across `character-create/html/**`. Any reorganization of bracket folders (which is FiveM's documented grouping mechanism, so reasonable to expect) breaks dozens of import paths. **Fix:** add `tsconfig` paths alias `@webview/*` and a matching Vite `resolve.alias`. Then every import is `@webview/components/ui/Spinner`.

- **LOW — `src/utils/schema.json` is the only thing in `src/utils/`** and is the JSON-schema source for `plugin.json`. Nothing imports it at runtime; it's referenced only by editor tooling (`$schema`-style) `[UNVERIFIED]`. Either delete or wire into manifest validation in `FileManager.loadPluginManifest`.

- **LOW — `shared/` is a convention, not enforced.** Only `character-create` has a `shared/` folder; `character-select` and `character-edit` duplicate types inline (or skip them). The `tsconfig.webview.json:30` includes `src/plugins/**/shared/**/*` overlapping with `tsconfig.plugins.json:19` — the same files are typechecked under DOM lib *and* Node lib. No emit collision because webview is `noEmit`, but conflicting `lib` settings can mask bugs.

## 5. `fxmanifest.lua` generation

### Field handling matrix

`generateFxManifest` (BuildManager.ts:1013-1278) and `getCustomProperties` allowlist (BuildManager.ts:1302-1326).

| `plugin.json` field | Dedicated emit? | In `standardProps`? | Result |
|---|---|---|---|
| `name` | **NO** | yes | **silently dropped** (FXServer infers from dir, but the field is documented & required by the schema) |
| `description` | yes (1043-1047) | yes | ok |
| `author` | yes (1039-1041) | yes | ok |
| `version` | yes (1049-1051) | yes | ok |
| `fx_version` | yes (default `'cerulean'`, 1026) | yes | ok |
| `games` | yes (default `gta5`, 1029-1034) | yes | ok |
| `client_scripts` (string \| array) | yes (1059-1077) | yes | ok |
| `server_scripts` (string \| array) | yes (1080-1098) | yes | ok |
| `shared_scripts` (string \| array) | yes (1101-1119) | yes | ok |
| `ui_page` | yes (1122-1125) | yes | ok |
| `dependencies` | yes (1156-1169) — string array | yes | object form (`{name, server}` per JSON schema) emits `'[object Object]'` |
| `provide` | yes (1172-1181) | yes | ok |
| `constraints` | yes (1184-1219) | yes | ok |
| `files` | yes (1128-1135) | yes | ok |
| `data_files` | yes (1138-1153) | yes | ok |
| `is_map` | yes (1242-1245) | yes | ok |
| `server_only` | yes (1248-1251) | yes | ok |
| `loadscreen` | yes (1254-1261) | yes | ok |
| `loadscreen_manual_shutdown` | yes (1258-1260) | yes | ok |
| `exports` | yes (1222-1229) | yes | ok |
| `server_exports` | yes (1232-1239) | yes | ok |
| `config` | **NO** | yes | **silently dropped** |
| `lua54` (in JSON schema) | no | no | passthrough → `lua54 'true'` (Lua expects unquoted boolean) |
| `experimental` (in JSON schema) | no | no | passthrough → `experimental '[object Object]'` |
| `convars` (in JSON schema) | no | no | passthrough → `convars '[object Object]'` |
| `custom_data` (in JSON schema) | no | no | passthrough → `custom_data '[object Object]'` |

### Findings

- **HIGH — `name` is in the schema as required, but never emitted.** BuildManager.ts:1303 lists `name` in `standardProps` (so it isn't passthrough'd), and `generateFxManifest` does not emit a `name '...'` line. FXServer derives the resource name from the directory, so no runtime impact today, but the schema lies about the field being meaningful. **Fix:** either remove `name` from the schema's `required` (it's redundant) or emit it for documentation parity.

- **HIGH — `config` is silently dropped.** BuildManager.ts:1325 puts `config` in `standardProps`, but `generateFxManifest` never references `manifest.config`. The README and JSON schema both describe `config` as a config object. **Fix:** remove `config` from `standardProps` (let it pass through) or define dedicated emit logic. Currently it goes nowhere.

- **HIGH — Custom-property passthrough produces invalid Lua for non-string values.** BuildManager.ts:1267-1275 stringifies any value via `String(value)`. For booleans this emits `lua54 'true'` — a Lua *string*, not the boolean FXServer expects. For nested objects (`experimental`, `convars`, `custom_data`) it emits `experimental '[object Object]'`. For numbers (`some_count: 5`) it emits `some_count '5'` (string, not number). **Fix:** type-aware emission — `boolean → key 'yes'/'no'`, `number → key VALUE`, `object → recurse or refuse`. Or refuse to emit non-string values and warn.

- **HIGH — Dedicated emit paths assume string-only forms even where the schema permits objects.** `dependencies` per JSON schema accepts items as `string` *or* `{name, server}`. BuildManager.ts:1156-1169 calls `escapeLuaString` directly on each item; an object would emit `'[object Object]'`. None of the four current plugins exercise this. **Fix:** type-narrow before stringifying, with an explicit branch for the object form.

- **MEDIUM — Default fallbacks override absent values without warning.** BuildManager.ts:1026 (fx_version → `'cerulean'`) and 1031 (games → `['gta5']`). Means a typo (`fx-version`) silently produces a working manifest with the default. **Fix:** treat missing required fields as a build error.

- **MEDIUM — `escapeLuaString` does not escape control bytes.** BuildManager.ts:1287-1294 covers `\\`, `'`, `\n`, `\r`, `\t`. It doesn't escape `\0`, `\b`, `\f`, `\x1b`, etc., or non-printable bytes. A plugin description containing a stray null byte would emit invalid Lua. Practical risk: low, but not zero. **Fix:** restrict to a known charset or hex-escape control bytes.

- **MEDIUM — Custom property keys are not validated.** BuildManager.ts:1268-1275 emits `${key} '${value}'` with `key` interpolated raw. A plugin.json with `"my-key with spaces": "x"` produces `my-key with spaces 'x'` (broken Lua identifier). **Fix:** validate `key` against `/^[a-z_][a-z0-9_]*$/i` and warn-or-fail on mismatch.

- **LOW — `dependencies` emit produces `dependencies {}` for the constraints branch even when there are also normal `dependencies`.** BuildManager.ts:1184-1219 always opens its own `dependencies { ... }` block for constraints, regardless of what 1156-1169 emitted. FXServer accepts repeated `dependencies` blocks (they merge), but the duplicated section is confusing and undocumented. **Fix:** merge into a single block.

## 6. Reload HTTP endpoint contract

### Two halves

- **Server**: `src/plugins/[default]/core/server/index.ts:176-292` — bare `http.createServer` listening on `GetConvarInt('resource_manager_port', 3414)`.
- **Client**: `src/scripts/managers/PluginReloadManager.ts:218-275` — bare `http.request`, `Bearer ${apiKey}` auth.

### Endpoints

| Method/Path | Server behavior | Client caller |
|---|---|---|
| `GET /` | 200, `text/plain "Resource Management API\n"` | none |
| `GET /resources` | 200, `{success, resources: string[], count}` | `getResources()` (PluginReloadManager.ts:113) and `initialize()` connectivity check (PluginReloadManager.ts:93) |
| `POST /restart?resource=<name>` | 200 (if `StopResource` succeeded sync) / 404 (if state === missing); body `{success, resource, message}` | `reloadResource(name)` (PluginReloadManager.ts:131) |
| `POST /restart` (no query) | 200, `{success, message, results: Record<name, boolean>}` | `reloadAllResources()` (PluginReloadManager.ts:181) |
| anything else | 404 | — |

### Auth

All routes require `Authorization: Bearer ${API_KEY}`. Comparison is `providedKey !== API_KEY` (string compare, not constant-time, line 200). Default key is the literal placeholder `'***SCRUBBED***'` (line 9) — see audit/00-inventory.md §6 for the CRITICAL on this.

### Findings

- **HIGH — `200 OK` on `/restart?resource=...` does not mean the restart succeeded.** Server flow at `[default]/core/server/index.ts:118-148`:
  1. `StopResource(name)` (sync; throws → caught → returns `false`)
  2. `setTimeout(() => StartResource(name), 500)` — async, fire-and-forget, after the response is already sent.
  
  So the HTTP response confirms only that `StopResource` did not throw; if `StartResource` 500ms later fails, the client sees `{success: true}`. The watcher in `build.ts:273-290` reports "✓ Reloaded plugin" on success, while the resource is dead in-game. **Fix:** await the restart (use a Promise wrapper around the timeout) or push start failures via a separate channel.

- **HIGH — Client requests have no timeout.** PluginReloadManager.ts:222-274 calls `httpModule.request` and `req.end()` without `req.setTimeout`. If the FXServer process is alive but the resource handler hangs (e.g., busy-looping in another resource's tick), the watcher hangs forever. **Fix:** `req.setTimeout(5000, () => req.destroy(new Error('timeout')))`.

- **HIGH — Health is determined from `GET /resources` only, but a missing-target resource still returns 200.** PluginReloadManager.ts:88-95 considers connectivity = success. There is no probe that the *target* resource is healthy before restart. If the in-game resource manager is up but the plugin to reload is in `stopped` state with a syntax error in its lua, the client gets a "successful" reload that just re-exhibits the same error. **Fix:** include resource state in the response and surface it to the client.

- **MEDIUM — Auth comparison is not constant-time** (`[default]/core/server/index.ts:200`). `===`/`!==` short-circuits on the first mismatching byte, leaking key length information via timing. Local-only attack surface today, but trivial to fix. **Fix:** `crypto.timingSafeEqual` over equal-length buffers.

- **MEDIUM — Endpoints are documented nowhere.** Neither the README nor any `.md` describes the contract. The companion in-game resource is required for `pnpm dev` to function but is part of the same repo (`[default]/core`); a reader would only discover that by reading both halves. **Fix:** at minimum, a README section listing the four routes, the auth header, and the port.

- **MEDIUM — POST requests carry no body but advertise `Content-Type: application/json`** (PluginReloadManager.ts:230). Harmless but signals the contract is unsettled. **Fix:** drop the header for the GET-shaped POSTs, or send `{}`.

- **LOW — Server's CORS is `Access-Control-Allow-Origin: *`** (`[default]/core/server/index.ts:182`). Combined with the placeholder API key from audit/00-inventory.md §6, any web page the operator visits could trigger a `restartallresources`. **Fix:** restrict CORS to `localhost`/`127.0.0.1` or remove (this isn't a public API).

- **LOW — Both halves use bare `http`/`url` modules.** Node's `url.parse` (server line 177) is deprecated; `http.request` without `keep-alive` opens a TCP connection per call. With <100 reloads per dev session this is a non-issue. **Fix:** migrate to `URL` and `fetch` (Node 22 has it natively); keep-alive Agent if reload volume grows.

- **LOW — `core` resource self-skip is fragile.** `restartAllResources` skips `GetCurrentResourceName()`, which works as long as the resource is named `core`. The resource manager itself lives under `[default]/core` so its directory name is `core`; if someone renames or moves it, the skip breaks (it would attempt to `StopResource(currentResource)`, killing the HTTP server mid-request). **Fix:** add a hardcoded boolean check, or refuse to stop the active resource by inspecting `resourceName === GetCurrentResourceName()` only.

## 7. Manager boundaries

### What each manager owns (verified)

| Manager | File | Owned state | Responsibilities |
|---|---|---|---|
| `FileManager` | `src/scripts/managers/FileManager.ts` (931 lines) | `plugins: Map`, `files: Map`, `pathToPlugin: Map`, `rootPath` | scan + parse `plugin.json` + walk file tree; load/parse manifests inline; CRUD on files (writeFile, deleteFile, copyFile); plugin lifecycle (createPlugin, removePlugin, reloadPlugin); plugin lookup by name/path |
| `BuildManager` | `src/scripts/managers/BuildManager.ts` (1419 lines) | `distPath`, `reloadManager?`, `initialized` | lua/json/ts/js/tsx file emission via esbuild; vite shell-out; fxmanifest.lua generation + escaping; App.tsx swap; clean dist; **also forwards reload calls to PluginReloadManager** |
| `PluginReloadManager` | `src/scripts/managers/PluginReloadManager.ts` (333 lines) | `apiKey`, `baseUrl`, `useHttps`, `logLevel`, `initialized` | HTTP client to in-game `/resources` and `/restart`; per-plugin and all-resources reload |
| `ManifestManager` | `src/scripts/managers/ManifestManager.ts` | (any) | **DEAD** — never imported (audit/00-inventory.md §2). Duplicates manifest parsing. |
| `PluginManager` | `src/scripts/managers/PluginManager.ts` | (any) | **DEAD** — never imported. Façade over FileManager. |
| `PluginBuilder` (in `build.ts:49-493`) | `build.ts` | `fileManager`, `buildManager`, `pluginResults`, `watcher` | top-level orchestrator + chokidar watcher + CLI parsing |

### Findings

- **HIGH — Cross-cutting state: `Plugin.manifest` is set by `FileManager.scanPlugins` (line 114), then read all over `BuildManager` and re-set in `FileManager.writeFile` for `plugin.json` mutations (line 518, 532).** A single mutable field in a shared object is the integration contract. There is no event when manifest changes; `BuildManager` re-reads `plugin.manifest` every call but never reloads the file. If the user edits `plugin.json` while watch is running, the manifest in memory does not refresh until `FileManager.writeFile` is called *through* FileManager (which the watcher does not do; chokidar fires file change events that route through `processRebuildQueue`, which calls `BuildManager.buildPlugin(name)` — and `BuildManager` reads `plugin.manifest` from the *stale* in-memory object). **Fix:** make `FileManager` re-read `plugin.json` when chokidar fires on it; or make `BuildManager` re-read manifest at build time.

- **HIGH — `BuildManager` writes files directly via `fs/promises`, bypassing `FileManager`.** BuildManager.ts:578, 606, 723, 750, 977, 981, etc. `FileManager.writeFile` is the registered code path; `BuildManager` never uses it. The `files: Map` registry in FileManager therefore drifts after every build (output dir is outside `rootPath`, so this is partially intentional, but the same is true for the App.tsx swap which writes inside `src/webview/`, a path the FileManager doesn't track at all). The end state is two parallel filesystem views: the source view in `FileManager` and the dist view in `BuildManager`, with no shared abstraction. **Fix:** if `FileManager` is meant to track only sources, name it accordingly (`SourceScanner`); otherwise route writes through it.

- **HIGH — Three log implementations.** `console.log/.error/.warn` directly in `BuildManager` (no level filter), `log()` method on `PluginReloadManager.ts:295-332` (verbose/info/warn/error filter), `log()` method on `PluginBuilder` in build.ts:455-492 (chalk + filter). `--log-level` only flows into `PluginBuilder`'s logger; `BuildManager`'s console calls never get filtered. Setting `--log-level error` still spams "Bundling TypeScript file" lines (BuildManager.ts:345). **Fix:** single `Logger` injected into all managers.

- **MEDIUM — Three `initialized: boolean` patterns.** FileManager.ts:35-48, BuildManager.ts:39-54, PluginReloadManager.ts:84-108. Each guarded by an `ensureInitialized()` private method that throws. This is a copy-paste pattern that should be a shared mixin/decorator or — simpler — replaced by always-ready constructors that take their dependencies as required args.

- **MEDIUM — `BuildManager.initializeReloadManager` is called with no options (BuildManager.ts:96 from build.ts:96).** None of `RELOADER_HOST`/`RELOADER_PORT`/`RELOADER_USE_HTTPS` are plumbed (audit/00-inventory.md §6, "five env vars never read"). The reload always goes to `localhost:3414` over plain HTTP. **Fix:** pull options from `process.env` in the construct path, or accept them on the CLI.

- **MEDIUM — Error wrapping is duplicated and lossy.** Every public method on every manager has the pattern:
  ```ts
  try { ... } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error <verb>ing ...', error);
    throw new Error(`Failed to <verb>: ${errorMessage}`);
  }
  ```
  Result: the stack trace points at the rethrow location, not the original throw. The original `error.cause` is dropped on the floor. With `--log-level verbose` the stack trace at build.ts:185 / build.ts:438 is the wrapped one. **Fix:** `throw new Error('Failed to ...', { cause: error })` (Node 16.9+ supports the `cause` option) so the original is recoverable.

- **MEDIUM — `BuildManager` knows about `PluginReloadManager` but not vice-versa.** Reasonable as a one-way edge, but `BuildManager.reloadPlugin` (line 81-119) is a thin pass-through that re-resolves the plugin and re-formats errors; the watcher in build.ts:273-291 already does the lookup itself. The `reloadPlugin` method in BuildManager could be deleted — the watcher should drive `PluginReloadManager` directly. **Fix:** drop `BuildManager.reloadPlugin` and let `PluginBuilder` own the orchestration of "build then reload."

- **LOW — `FileManager` has a `reloadPlugin(pluginPath)` method (line 877-927) that is distinct from `BuildManager.reloadPlugin` and `PluginReloadManager.reloadPlugin`.** Three methods, three different semantics: FileManager re-reads from disk, BuildManager builds, PluginReloadManager hits HTTP. The naming collision masks intent. **Fix:** rename to `rescan`, `rebuildAndReload`, `reloadInGame` respectively.

- **LOW — `findPluginForPath` is implemented twice.** FileManager.ts:816-837 (private) and build.ts:348-366 (private). Identical longest-prefix-match. **Fix:** expose the FileManager version and call it from `PluginBuilder`.

- **NIT — Constructor-injected dependencies are not type-narrowed.** `BuildManager` accepts `FileManager` as concrete class, not an interface. Makes mocking and replacement harder.

---

## Top 5 risks

1. **HIGH — App.tsx swap + restore is unsafe (3 ways).** Already leaked in repo (`src/webview/App.tsx:1-10`). Crashes/SIGINT during a build will not restore. Two concurrent processes deterministically corrupt the file. The right fix is to stop mutating the shared file at all — generate per-plugin entry files or a Vite virtual module — which also unblocks parallel webview builds (§2). [§1, §2]
2. **HIGH — Reload reports "success" before the start completes.** `POST /restart?resource=...` returns 200 once `StopResource` returns; `StartResource` runs 500ms later in `setTimeout` with no error reporting back to the HTTP client. The `pnpm dev` watcher logs "✓ Reloaded" while the resource is dead in-game. [§6]
3. **HIGH — `name` and `config` from `plugin.json` are silently dropped; non-string custom properties emit `'[object Object]'`.** Schema documents fields the build doesn't honor (`config`, `lua54`, `experimental`, `convars`, `custom_data`). Boolean `lua54: true` becomes `lua54 'true'` (Lua string, not boolean) — looks like it works because FXServer parses it leniently. [§4]
4. **HIGH — Path-substring detection misclassifies `shared/` and bundles every `.ts` file in the tree as its own entry.** `BuildManager` walks files instead of consuming `plugin.json`'s `client_scripts`/`server_scripts` declarations as entry points. Means stray TS files end up in the resource output even when not declared, and shared modules bundle redundantly across browser/node platforms. [§3]
5. **HIGH — Three independent log paths and three duplicated `initialized` patterns make the `--log-level` flag a lie.** `BuildManager` logs through bare `console.*`; only `PluginBuilder` and `PluginReloadManager` honor the flag. Operators who ask for quieter output don't get it. Plus the wrapped error pattern (`new Error(messageOf(originalError))`) drops `error.cause`, so failure root causes are obscured in the watcher logs. [§7]

---

## Open questions for later prompts

- **P2/Build correctness:** does the per-file esbuild walk emit any `.ts` file that the manifest's `client_scripts`/`server_scripts` patterns wouldn't pick up? `[UNVERIFIED]` — would need a runtime build of an experimental plugin with extra TS files.
- **P2/Build correctness:** what happens if a plugin's `Page.tsx` import path resolves outside its plugin folder (e.g., `import { x } from '../../other-plugin/...'`)? Vite would happily bundle it into the wrong plugin. `[UNVERIFIED]` — no test case in the repo.
- **P3/Manifest correctness:** does `getCustomProperties` correctly emit a manifest with a dependency in object-form (`{name: 'X', server: '>= 5181'}`)? Per JSON schema this is legal. `[UNVERIFIED]` — none of the four current plugins use this form; the build would emit `'[object Object]'`.
- **P3/Reload correctness:** what does the in-game `core` HTTP server do under concurrent restart requests for the same resource (e.g., the watcher fires twice in quick succession, and both StopResources race)? The 500ms timeouts could overlap. `[UNVERIFIED]`.
