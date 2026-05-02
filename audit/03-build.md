# P3 — Build Pipeline Robustness

Read-only robustness audit of `src/scripts/**` as of `master @ ffae3e5e` (2026-05-02). Severity tags: CRITICAL / HIGH / MEDIUM / LOW / NIT. `[UNVERIFIED]` marks claims that would need a runtime check. Findings already covered by `audit/00-inventory.md` or `audit/01-architecture.md` are referenced rather than repeated.

---

## 1. Error-handling matrix

### (a) Single plugin fails during `pnpm build`

- **Default behavior: continues, exits 1.** `PluginBuilder.buildSinglePlugin` catches the error, records `{success: false, error}` in `pluginResults`, logs `✗ Failed to build`, and returns. The outer loop in `buildAll` keeps iterating (build.ts:127-129). At the end, `failureCount > 0` causes `buildAll` to return `false`, which `main()` translates to `process.exit(1)` (build.ts:582-583).
- **`--stop-on-error`: re-throws.** build.ts:445-448 re-throws inside `buildSinglePlugin`, escaping the `for` loop. The outer `buildAll` `try/catch` (build.ts:176-189) logs `❌ Fatal build error` and returns `false`. **Bug**: `buildAll`'s catch happens *before* the build summary logs, so the user sees no summary and no list of which plugins succeeded before the failure.
- **Partial outputs are NOT cleaned up.** `BuildManager.buildPlugin` (BuildManager.ts:125-181) does `mkdir(destDir)` first, then runs the six file-type builds in parallel (BuildManager.ts:148-155). If the TS bundle fails after the Lua copy succeeded, the half-built plugin folder is left in `[GENERATED]/` with stale Lua but no JS. The next `pnpm build` will only call `clean()` once (BuildManager.ts:122) so stale partial output from a failed `--no-clean` build persists indefinitely.

**HIGH — partial-build outputs are not transactional.** BuildManager.ts:142-155. A plugin is built into its final destination with no staging directory; mid-build failure leaves a half-populated dist. **Fix:** build into a temp dir (`<destDir>.tmp`) and atomically rename on success; on failure, `rm -rf` the temp dir.

**MEDIUM — `--stop-on-error` swallows the build summary.** build.ts:176-189. The fatal-error catch logs the message but skips the summary block at build.ts:140-168. Operators using `--stop-on-error` lose visibility into which plugins built before the failure. **Fix:** print the summary in a `finally`, then exit non-zero.

### (b) Same failure during `pnpm dev`

- **Watcher survives.** `processRebuildQueue` wraps the per-plugin loop in `try/catch` (build.ts:227-303). Errors are logged, `isBuilding` is reset in `finally` (build.ts:297-298), and the next file change re-enters the queue. Good.
- **But: `--stop-on-error` in watch mode breaks the watcher.** With `continueOnError: false`, `buildSinglePlugin` re-throws, escaping the `for` loop in `processRebuildQueue` at build.ts:250-252. The outer `try/catch` logs "Error during rebuild" and `isBuilding` resets, so subsequent saves still trigger rebuilds — but the *current* batch's remaining plugins are skipped silently. Reload is also skipped because the for-loop never reaches the reload section at build.ts:271-291.
- **Reload failures during watch are non-fatal.** `buildManager.reloadPlugin` (BuildManager.ts:81-119) catches and returns `{success: false, message}`; the watcher logs "⚠ Failed to reload" and continues (build.ts:283-289). Good.

**LOW — `--stop-on-error` in watch mode is half-honored.** It aborts the current rebuild batch but leaves the watcher running, which is neither fail-fast nor resilient. **Fix:** ignore `--stop-on-error` when `--watch` is set (with a warning), or document the partial-batch semantics.

### (c) `plugin.json` invalid or missing required fields

- **Invalid JSON → silent fallback.** `FileManager.loadPluginManifest` (FileManager.ts:148-171) catches the `JSON.parse` error, logs a warning, and returns `{ name: <dir-basename> }` cast to `PluginManifest`. `BuildManager.buildPluginManifest` then runs against this skeleton manifest and emits a barebones `fxmanifest.lua` containing only `fx_version 'cerulean'` + `games { 'gta5' }` (BuildManager.ts:1026-1034). The fxmanifest *appears valid* even though the plugin is broken — no `client_scripts`, no `server_scripts`, no `ui_page`. **The build reports success.**
- **Missing required fields → no validation at all.** The `BasicPluginManifest`/`PluginManifest` types declare `name` as required but nothing checks it. `src/utils/schema.json` exists but is never loaded by `FileManager` (audit/01-architecture.md §4 LOW). A `plugin.json` of `{}` builds "successfully" with all defaults.

**HIGH — invalid `plugin.json` silently produces a corrupt-but-success build.** FileManager.ts:155-165 + BuildManager.ts:963-968. The user sees `✓ Built <plugin>` while the plugin is actually broken (no scripts emitted in the manifest). **Fix:** treat manifest-parse failure as a fatal error for that plugin's build, recorded as `success: false` so the summary surfaces it. Also wire `src/utils/schema.json` through ajv (or similar) to catch missing fields.

### (d) Plugin folder has no `client/`, `server/`, or `html/`

- **Build runs, emits an empty resource.** Each `buildPluginXxx` filters `plugin.files` for the relevant extension (BuildManager.ts:201, 255, 310, 431, 542). If the only file is `plugin.json` (which is excluded from JSON copy at BuildManager.ts:255-258), every builder logs `No <type> files found in plugin <name>` and returns. `buildPluginManifest` still emits `fxmanifest.lua`. Result: a directory with just `fxmanifest.lua`. Not strictly wrong (FXServer accepts script-less resources), but indistinguishable from a genuine config-only resource.
- **No `Page.tsx` even with `ui_page` declared:** the manifest still emits `ui_page 'html/index.html'` but `html/index.html` is never produced. FXServer will fail to load the resource at runtime.

**MEDIUM — `ui_page` in manifest is not cross-checked against actual webview output.** BuildManager.ts:1122-1125 emits the `ui_page` line whenever `manifest.ui_page` is set, regardless of whether `buildPluginPageTsx` produced a matching file. **Fix:** either (a) verify `manifest.ui_page` resolves to an emitted file, or (b) skip emitting `ui_page` when no Page.tsx exists.

### (e) `[GENERATED]` directory locked by FXServer (Windows)

- **`clean()` will throw EBUSY/EPERM.** BuildManager.ts:867-891 calls `fs.rm(this.distPath, { recursive: true, force: true })`. On Windows, `force: true` does NOT bypass file-locks held by another process — it only suppresses ENOENT. If FXServer has any file in `[GENERATED]/` open (which it does — every loaded resource holds its compiled scripts), `fs.rm` rejects with `EBUSY` or `EPERM`. The error bubbles out of `clean()`, is caught in `buildAll`'s `try/catch` (build.ts:176-189), and the entire build aborts before any plugin builds.
- **`--no-clean` workaround**: bypasses `clean()` entirely, so per-plugin overwrites proceed. But individual `fs.copyFile` / `fs.writeFile` calls into a locked file will *also* throw EBUSY/EPERM.
- **`fs.copyFile` on a locked target**: copyFilesToDist (BuildManager.ts:733-752) does `fs.copyFile(file.fullPath, destPath)` with no retry. On Windows this fails when FXServer has the destination open. There is no fallback to "stop the resource first, then copy".

**HIGH — Windows file-locks cause `pnpm build` to abort with no actionable error.** BuildManager.ts:878 + 750 + 981 (every `writeFile`/`copyFile`/`rm` against `[GENERATED]/`). The CLAUDE.md says `pnpm dev` reloads through the HTTP endpoint precisely to manage this — but the cold `pnpm build` path does no such coordination. **Fix:** before `clean()`, send `POST /restart` or `stopallresources` to the running FXServer (if reachable); on Windows, retry locked files with exponential backoff. At minimum, document the failure mode.

### (f) Network failure posting to reload endpoint

- **Connection refused / ECONNREFUSED.** `PluginReloadManager.makeRequest` (PluginReloadManager.ts:218-275) listens on `req.on('error', reject)`. The error propagates up through `reloadResource → reloadPlugin → BuildManager.reloadPlugin`, which catches and returns `{success: false, message}` (BuildManager.ts:109-118). The watcher logs `⚠ Failed to reload` and continues. Good.
- **DNS failure / EAI_AGAIN.** Same path. Same handling.
- **TCP connect succeeds but server hangs forever (no response).** **`req.setTimeout` is never called.** PluginReloadManager.ts:222-275 does `req.end()` and waits indefinitely on `res.on('end')`. If FXServer is alive but its event loop is blocked (heavy resource, long tick), the watcher hangs. The next file change can't trigger a rebuild because `processRebuildQueue` is gated on `isBuilding`, which gates on the prior reload completing.
- **`initialize()` connectivity check failure.** `BuildManager.initializeReloadManager` catches and **silently degrades**: BuildManager.ts:67-73 sets `this.reloadManager = null` and warns "Plugins will be built but not automatically reloaded". The watcher then continues without reload — no retry, no later reconnect. If FXServer comes up *after* `pnpm dev` starts, reloads never resume until the dev restarts the watcher.

**HIGH — reload requests have no timeout; one hung request stalls the entire watcher.** PluginReloadManager.ts:218-275. Combined with `isBuilding` gating in build.ts:221, a single hang freezes hot-reload for the dev session. **Fix:** `req.setTimeout(5000, () => req.destroy(new Error('reload timeout')))` and surface the timeout as a non-fatal warning. Already noted in audit/01-architecture.md §6.

**MEDIUM — degraded-reload state never re-tries.** BuildManager.ts:67-73 sets `reloadManager = null` permanently on first failure. **Fix:** retry connectivity probe periodically (e.g., before each reload), or treat initial-connect failure as a warning and let the per-call request decide.

---

## 2. Watch-mode behavior

### Debounce / throttle

- **Two layers of debounce.** chokidar `awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 }` (build.ts:209-212) waits for the file to stop changing, then `setTimeout(processRebuildQueue, 300)` (build.ts:331-334) batches changes within 300ms. Net: ~600ms minimum from final write to rebuild start.
- **Hardcoded.** Neither value is configurable; `DEBOUNCE_TIME` / `RESOURCE_DEBOUNCE_TIME` / `WEBVIEW_DEBOUNCE_TIME` env vars are documented in `.env.example` and read by no code (audit/00-inventory.md §6).
- **No throttling on reload calls.** A burst of saves to one plugin → one rebuild and one reload, fine. But two plugins with simultaneous saves → two sequential reloads, each waiting on the prior. There is no global rate limit.

### File deletions

- `chokidar.on('unlink', ...)` is wired (build.ts:342). It calls `handleFileChange` which adds the *plugin* to the rebuild queue. The plugin is rebuilt, but **nothing deletes the corresponding output file**. `copyFilesToDist` only copies the current `plugin.files`; deleted files are never removed from `dist`. Stale `.lua`/`.js`/`.json` outputs from removed source files persist in `[GENERATED]/<plugin>/` forever.
- **`FileManager.files` map is not updated** when chokidar fires `unlink`. The watcher does not call `fileManager.deleteFile` or `fileManager.refresh`. So `plugin.files` still contains the deleted file. `copyFilesToDist` then attempts `fs.copyFile(deletedPath, destPath)` and throws ENOENT. The whole rebuild fails.

**HIGH — file deletions break the watcher.** build.ts:342 routes `unlink` to `handleFileChange`, but `FileManager`'s in-memory `plugin.files` array is never updated, so the next rebuild of that plugin tries to `fs.copyFile` a path that no longer exists and throws. **Fix:** on `unlink`, remove the file from `FileManager`'s registry (and from the dist, see next point) before re-queuing the plugin.

**HIGH — deleted source files leave stale dist outputs.** `copyFilesToDist` is additive only. **Fix:** rebuild into a per-plugin temp dir and rename (also fixes §1(a)), or diff `plugin.files` against the previous build to compute deletions.

### Plugin folder rename / delete

- **Plugin folder unlink (rmdir):** chokidar emits an `unlink` event for each file inside, then `unlinkDir` for the folder. The watcher subscribes only to `add`/`change`/`unlink`, **not `unlinkDir`** (build.ts:340-342). When the last file is removed, `findPluginForPath` for the removed-file path still finds the plugin (because `plugin.fullPath` matches by prefix), so the watcher tries to rebuild a plugin whose source no longer exists. `scanPluginFiles` would re-walk the empty (now nonexistent) `plugin.fullPath` and throw ENOENT.
- **Plugin rename:** chokidar emits `unlink` for old paths and `add` for new paths. The new paths don't match any registered plugin's `fullPath` (because `FileManager.scanPlugins` only ran at startup), so `findPluginForPath` returns `undefined` and the new files are silently ignored.
- **Bottom line: rename/delete of an entire plugin requires a watcher restart.**

**HIGH — plugin folder rename / delete is unsupported at runtime.** build.ts:307-336. **Fix:** detect plugin folder events (a watched path becoming a `plugin.json` add/unlink) and call `fileManager.refresh()` to rescan. Or simpler: if `findPluginForPath` returns `undefined` and the file is a `plugin.json`, rescan.

### Brand-new plugin folder appears at runtime

- **Not built.** A new `<root>/[group]/new-plugin/plugin.json` triggers a chokidar `add`. `findPluginForPath` walks the existing `plugins` map, and since the new plugin was never registered, no match → ignored. The same is true for any source file inside the new plugin.
- The watcher does have access to `fileManager` and could call `refresh()` on detecting an unmatched `plugin.json`, but it doesn't.

**HIGH — adding a new plugin while `pnpm dev` is running requires a watcher restart.** build.ts:307-336. Same root cause as the rename case. **Fix:** when chokidar fires on an unrecognized path, check whether it's a `plugin.json`; if so, call `fileManager.refresh()` and trigger a build of the new plugin.

### Editing `plugin.json`

- **Stale manifest is built.** A `plugin.json` change fires `change` → `handleFileChange` finds the plugin → enqueued. `BuildManager.buildPlugin` runs `buildPluginManifest`, which reads `plugin.manifest` from the in-memory `Plugin` object. But `plugin.manifest` was set during `FileManager.scanPlugins` at startup and is **never refreshed by chokidar events**. The `fxmanifest.lua` is regenerated from the *old* manifest data.
- The only refresh path is `FileManager.writeFile`, which the watcher does not call (it only reads — chokidar fires after the editor wrote the file).
- `FileManager.getPluginManifest` checks `if (plugin.manifest) return plugin.manifest;` (FileManager.ts:434-435), so even an explicit re-read short-circuits to the cache.

**HIGH — editing `plugin.json` does not refresh the in-memory manifest; the rebuild emits an `fxmanifest.lua` from stale data.** BuildManager.ts:963 reads `plugin.manifest` directly. **Fix:** in the watcher's `handleFileChange`, if the changed file is `plugin.json`, re-read it (`fileManager.reloadPlugin` already exists at FileManager.ts:877-927) before triggering the rebuild. Already noted in audit/01-architecture.md §7.

---

## 3. Cleanup semantics

### What `--no-clean` keeps

- **Everything in `[GENERATED]/` from prior builds.** The flag short-circuits `clean()` (build.ts:120-124), and per-plugin builds never delete files, only overwrite (BuildManager.ts:733-752 is `fs.copyFile`, no prior delete).
- **Implication: stale files survive.**
  - A plugin renamed from `foo` → `bar` leaves `[GENERATED]/.../foo/` orphaned (its own dir is never removed).
  - A plugin whose source file `client/old.ts` was deleted leaves `[GENERATED]/.../<plugin>/client/old.js` orphaned.
  - A plugin removed entirely from `src/plugins/` leaves its entire `[GENERATED]/.../<plugin>/` dir.

### `[GENERATED]` integrity

- **No orphan-detection.** `BuildManager` does not enumerate the contents of `[GENERATED]/`; it only writes plugin-by-plugin. There is no "delete files in dist that don't correspond to a known plugin" pass.
- **Even with `clean()` (the default), `--no-clean` is the only bypass; but `clean()` itself is brittle (see §1(e) — Windows locks).**

**HIGH — `--no-clean` mode produces non-deterministic, accumulating output.** **Fix:** make `--no-clean` a per-plugin guarantee (don't touch dirs of plugins that didn't change) but add a periodic orphan-sweep that deletes dist directories without a matching source plugin. Or alternatively, drop `--no-clean` and make `clean()` smart enough to be cheap (rsync-style sync from a per-build manifest of expected outputs).

**MEDIUM — `clean()` rm-and-recreate races with FXServer.** BuildManager.ts:867-891. While `rm` is mid-recursion and the directory partially exists, FXServer's resource scan may pick up an inconsistent state. Already flagged in audit/00-inventory.md open question P6. **Fix:** rename the dir to `[GENERATED].old.<ts>`, recreate `[GENERATED]`, then async-delete the old dir; FXServer sees one atomic swap.

---

## 4. `PluginReloadManager` lifecycle

### Connection lifecycle

- **One probe at startup.** `BuildManager.initializeReloadManager` → `PluginReloadManager.initialize` → `makeRequest('/resources')` (PluginReloadManager.ts:84-108). Pass = `initialized = true` forever. Fail = `reloadManager` set to `null` forever.
- **No keep-alive.** Each `makeRequest` opens a fresh TCP connection (Node default `Agent`, no `keepAlive`). For watch sessions this is fine (low call rate); for `pnpm build --reload-all` it's a small wart.
- **No reconnect on transient failure.** A successful `initialize()` doesn't get tested again after FXServer restarts. A subsequent `reloadResource` will fail with ECONNREFUSED and return `{success: false}`; the watcher logs the warning but the manager stays "initialized".

### Retry policy

- **Zero retries.** PluginReloadManager.ts:218-275. Network error → reject. Non-2xx → reject. Bad JSON → reject. The error reaches `reloadResource` which catches and returns a failure result. No exponential backoff, no second attempt.

### FiveM restart mid-watch

- If FXServer restarts: ongoing `req` rejects with `ECONNRESET`, watcher logs warning. Next reload also fails (FXServer not yet listening). Once FXServer is back up, *reloads work again* — `initialized` is still `true`, `makeRequest` just opens a fresh socket. **Good.**
- If FXServer fails to come back up: every reload returns failure but the build pipeline keeps producing output. **Good.**
- However, if `BuildManager.initializeReloadManager` failed at *startup* (FXServer was down), `reloadManager` is `null` forever — even after FXServer comes up. **Bad** (see §1(f)).

### Queueing of back-to-back reloads

- **No queue.** `processRebuildQueue` (build.ts:220-303) runs reloads sequentially in a `for` loop (build.ts:273-291). Each `reloadPlugin` is awaited before the next; no parallelism, no batching. For 5 changed plugins, that's 5 sequential HTTP roundtrips.
- The watcher's outer-level rebuild queue (`isBuilding` gate) prevents a *new batch* from interleaving with reloads of the previous batch.
- **Consequence**: a long-stuck reload (no timeout, see §1(f)) freezes the entire watcher for any subsequent change.

### Auth rejection

- **Returns 401 → rejected as HTTP error.** PluginReloadManager.ts:245-250 rejects on `statusCode < 200 || >= 300`. The error message includes the body (the in-game server emits `{success: false, message: 'Unauthorized'}` — verified at `[default]/core/server/index.ts:198-208`). `reloadResource` catches and returns `{success: false, message: 'HTTP error 401: ...'}`. Watcher logs warning. **No bail-out.**
- **Implication**: if the API key is wrong, every build cycle fires a 401, gets logged once as a warning, and the watcher keeps grinding. There is no "API key was rejected, refusing to retry" behavior.

**MEDIUM — auth rejection is treated as a transient failure.** PluginReloadManager.ts:245-250. A wrong key produces a flood of 401 warnings, one per save. **Fix:** on a 401 response, set `reloadManager = null` and log "Reload disabled: invalid API key" once. Or fail-loud at startup: `initialize()` already calls `/resources`, so a 401 there should throw a clear error.

---

## 5. Parallelism opportunities

### Current state

- **Within a plugin**: BuildManager.ts:148-155 already runs Lua copy / JSON copy / TS bundle / JS bundle / manifest gen / other-files copy in `Promise.all`. **Good.**
- **Within TS bundling**: `buildPluginTs` iterates files sequentially with `await esbuild.build` (BuildManager.ts:323-385). Same for JS. Each plugin's TS files are bundled one at a time even though esbuild itself is parallel-safe.
- **Across plugins**: `buildAll` and `processRebuildQueue` iterate sequentially (build.ts:127, 250). Forced sequential by the App.tsx swap (audit/01-architecture.md §1).
- **`buildPluginPageTsx` runs *before* `Promise.all`** (BuildManager.ts:145-155) — meaning the webview build serializes the entire pipeline even when it could overlap with Lua/JSON copies (which don't touch `App.tsx`).

### Opportunities

| Step | Currently | Could be | Blocker |
|---|---|---|---|
| TS files within a plugin | sequential `for await` | `Promise.all` over esbuild builds | none |
| JS files within a plugin | sequential | `Promise.all` | none |
| Webview vs. Lua/JSON within a plugin | sequential (`await` then `Promise.all`) | one `Promise.all` for everything | **App.tsx swap** mutates a shared file (would race with Lua copy if both run during a single plugin build — but only the webview touches App.tsx, so this is safe today). Could parallelize. |
| Multiple plugins (no webview) | sequential | `Promise.all` over plugins | **App.tsx swap** for the plugins that *do* have webviews |
| Multiple plugins (all parallel) | sequential | `Promise.all` | App.tsx swap. Once the swap is removed (per-plugin entry file), Vite can run N children in parallel (audit/01-architecture.md §1, §2) |

**MEDIUM — TS bundling is sequential within a plugin without justification.** BuildManager.ts:323-385 `for (const file of tsFiles)` with `await`. `esbuild.build` is fully concurrent-safe. With ~5 TS files per plugin and ~50ms per build, parallelism would save ~200ms per plugin. **Fix:** `await Promise.all(tsFiles.map(file => esbuild.build(...)))`.

**MEDIUM — `buildPluginPageTsx` could run concurrently with Lua/JSON copies.** BuildManager.ts:145-155. The webview build only touches `src/webview/App.tsx` and the plugin's `html/` output dir; nothing the Lua/JSON copies care about. **Fix:** include `buildPluginPageTsx` in the `Promise.all` block. (Note: per-plugin file copies do not interfere with cross-plugin `App.tsx` mutations because the orchestrator is already sequential across plugins.)

**HIGH — Cross-plugin parallelism is blocked by the App.tsx swap.** Already covered in audit/01-architecture.md §1, §2. The right fix unblocks 3-5x speedup on `pnpm build`.

---

## 6. Logging

### Three log paths

| Path | Where | Honors `--log-level`? |
|---|---|---|
| `PluginBuilder.log` | build.ts:455-492 | ✓ (with timestamp + chalk) |
| `PluginReloadManager.log` | PluginReloadManager.ts:295-332 | ✓ (with timestamp, no color) |
| Direct `console.log/.warn/.error` | All over `BuildManager` (BuildManager.ts:47, 66, 70, 71, 101, 103, 112, 139, 157, 165, 206, 211, 218, 226, 261, 266, 273, 281, 316, 345, 366, 379, 387, 394, 402, 437, 457, 476, 489, 497, 504, 512, 550, 554, 579, 587, 598, 607, 618, 632, 702, 711, 722, 816, 820, 826, 830, 837, 841, 843, 852, 859, 871, 884, 888, 964, 983, 988, 996, 1367, 1371, 1386, 1391, 1398, 1406) and `FileManager` (FileManager.ts:39, 74, 75, 101, 118, 127, 139, 156, 265, 444, 461, 468, 491, 545, 590, 659, 736, 791, 907, 917, 921) | ✗ |

- **`--log-level error` does nothing for ~80% of build output.** Both `BuildManager` and `FileManager` log directly via `console.*` with no level filter. `--log-level error` will still print:
  - `BuildManager initialized successfully`
  - `Building plugin: ...`
  - `Bundling TypeScript file: ...`
  - `Generated temporary App.tsx for plugin ...`
  - `Original path: <full glob>` / `Escaped path: <full glob>` (from `FileManager.escapeGlobPattern`, FileManager.ts:74-75 — fires for every plugin discovery and every glob match)
- **No correlation IDs.** A failed build's stack trace points at the wrap-rethrow site, not the original throw (audit/01-architecture.md §7 MEDIUM). With `--log-level verbose` the watcher prints the wrapped error stack, which is the same wrapped stack you'd see in `--log-level info`.
- **`FileManager.escapeGlobPattern` logs both raw and escaped patterns to `console.log` unconditionally** (FileManager.ts:74-75). This is debug output that ships in production.

**HIGH — `--log-level` is honored by 1 of 3 log surfaces.** Operators who set `error` still see hundreds of `console.log` lines per build. **Fix:** inject a single `Logger` interface into all managers (or a level-aware log function imported everywhere) and replace every `console.*` call.

**MEDIUM — `FileManager.escapeGlobPattern` prints debug lines unconditionally.** FileManager.ts:74-75. Two `console.log` lines per glob, ~5+ per startup, ~5+ per `getFilesMatchingPattern` call (which doesn't get called in the current code path but would on any feature use). **Fix:** delete the two `console.log` lines.

**MEDIUM — error-wrapping pattern drops `error.cause`.** Every manager re-throws as `new Error(\`Failed to ...: ${errorMessage}\`)` instead of `new Error('Failed to ...', { cause: error })`. Stack traces and root causes are not recoverable from logs. Already noted in audit/01-architecture.md §7. **Fix:** use the `cause` option throughout.

---

## 7. Build determinism

### Wall-clock timestamps

- **`fxmanifest.lua` header**: `BuildManager.ts:1020` `-- Generated on: ${new Date().toISOString()}`. Every build → different bytes for the same source.
- **`App.tsx` stub**: `BuildManager.ts:671` `// Generated on: ${new Date().toISOString()}`. Same problem — *and* this leaks into git when the swap-restore guard misfires (audit/01-architecture.md §1).

### Random IDs

- None observed. esbuild output, Vite hashes, etc. are content-derived.

### Iteration order

- **Plugin order = glob result order**, which is filesystem-dependent. `glob` returns paths in fs order, which is stable per fs but not portable across machines. For the same machine + same source, builds are identical aside from timestamps.
- **`plugin.files` order** is `fs.readdir` order — same caveat. esbuild bundles files individually and IIFE-wraps each, so order doesn't affect bundle contents.
- **Manifest `fxmanifest.lua` field order** is fixed by the generator (BuildManager.ts:1013-1278). Stable.
- **`getCustomProperties` iteration**: `Object.entries(manifest)` preserves insertion order from `JSON.parse`, which preserves the source `plugin.json` key order. Stable as long as `plugin.json` doesn't reorder keys.

**MEDIUM — every build of every plugin produces non-byte-identical output due to two `Date.toISOString()` calls.** BuildManager.ts:1020 + 671. Breaks content-addressable caching, makes "did this PR change build output" impossible to answer with `git diff`. **Fix:** drop the timestamp from both files (the generation comment is sufficient documentation; the actual change is detectable by content diff).

---

## 8. CLI argument parsing

### Implemented flags

| Flag | Effect | Used? |
|---|---|---|
| `--plugins-dir, -p <dir>` | Override `pluginsDir` | Yes |
| `--dist-dir, -d <dir>` | Override `distDir` | Yes |
| `--no-clean` | Skip `clean()` | Yes |
| `--log-level, -l <level>` | Set log level | Partially (audit §6) |
| `--stop-on-error` | Re-throw on per-plugin failure | Yes (with caveats — audit §1(a), §1(b)) |
| `--watch, -w` | Enable watcher | Yes |
| `--help, -h` | Print help | Yes |

### Unparsed-but-documented elsewhere

- **None of the reload env vars are CLI flags.** `RELOADER_HOST`, `RELOADER_PORT`, `RELOADER_USE_HTTPS` are read by `PluginReloadManager` constructor options but `BuildManager.initializeReloadManager` is called with `{}` (BuildManager.ts:96 from build.ts:96). Even if you set the env vars, they don't reach the manager.

### Wrong combinations

- **`--watch --stop-on-error`**: see §1(b). Watcher survives, but per-batch builds may exit early without a useful status. Not silent corruption, but undocumented.
- **`--no-clean --watch`**: works, but every saved-then-deleted source file leaves a stale dist file forever. See §3.
- **`--plugins-dir <empty-dir>`**: `FileManager` warns "No plugins found" and returns. `buildAll` reports `Building 0 plugins sequentially`, succeeds, exits 0. No error. Probably correct.
- **`--dist-dir <relative path>`**: `path.resolve(distPath)` (BuildManager.ts:32) resolves against `process.cwd()`. If `pnpm build` is invoked from a subdirectory, output goes there. Surprising but consistent.
- **`--log-level <invalid>`**: `parseArgs` logs `Invalid log level: ${level}. Using default.` to `console.error` (build.ts:523), then defaults to `info`. The error message doesn't list valid values. NIT.
- **Unknown flag**: silently ignored (`switch` has no default case, `for` loop continues). `pnpm build --foo` proceeds. NIT.

### Help text bugs

- **`Usage: ts-node build.ts ...`** but the project uses `tsx`. Already noted in audit/00-inventory.md §2 NIT.
- **`--dist-dir` default in help**: says `(default: dist)`, but the actual default at build.ts:64-66 is `txData/${process.env.SERVER_NAME}/resources/[GENERATED]` (audit/00-inventory.md §2). Misleading.

**MEDIUM — help text default for `--dist-dir` is wrong.** build.ts:555. The actual default depends on `SERVER_NAME` and points into `txData/`, not `dist/`. **Fix:** update the help string.

**LOW — unknown CLI flags are silently ignored.** build.ts:502-538 has no default case. **Fix:** error-and-exit on unknown flags, matching the `--log-level invalid` UX.

**LOW — reload-related options have no CLI surface.** The `ReloadOptions` interface exists but nothing plumbs it. **Fix:** read `RELOADER_HOST`/`RELOADER_PORT`/`RELOADER_USE_HTTPS` from `process.env` inside `BuildManager.initializeReloadManager`, or expose `--reload-host` / `--reload-port` flags.

---

## Top 5 risks (P3-specific, not duplicating P0/P1)

1. **HIGH — Mid-build failure leaves a half-populated dist directory.** No staging/rename, no cleanup. `[GENERATED]/<plugin>/` ends up with stale Lua + missing JS, indistinguishable from a successful build to FXServer. With `--no-clean` this state persists indefinitely. [§1(a)]
2. **HIGH — File deletions break the watcher and leak stale dist outputs.** chokidar `unlink` is wired but `FileManager.files` is never updated; the next rebuild attempts to copy a path that no longer exists and fails. Even when copies succeed, deleted source files are never removed from dist. Same root cause kills plugin rename/delete and new-plugin-at-runtime support. [§2]
3. **HIGH — `plugin.json` edits don't refresh the in-memory manifest.** The rebuild emits an `fxmanifest.lua` from stale data. Combined with the silent-fallback for invalid JSON (manifest collapses to `{name: <dir>}` without warning), users can break their plugin and see `✓ Built plugin` with a useless manifest. [§1(c), §2]
4. **HIGH — Reload requests have no timeout; one hung request stalls the entire watcher.** No `req.setTimeout`. Combined with the `isBuilding` gate, a single FiveM tick freeze deadlocks hot-reload until the watcher is killed. The auth-rejection path is also non-fatal, so a wrong key produces a flood of 401 warnings rather than failing loudly. [§1(f), §4]
5. **HIGH — `--log-level` is honored by 1 of 3 log surfaces.** `BuildManager` and `FileManager` log directly via `console.*` with no level filter; `--log-level error` still prints hundreds of info-level lines per build. `FileManager.escapeGlobPattern` even logs raw debug strings unconditionally. The flag is, in effect, decorative for most output. [§6]

---

## Open questions for later prompts

- **P4/Determinism:** does esbuild's IIFE wrapper produce identical bytes across runs (same source → same output)? Sourcemap-inline is base64, content-derived `[UNVERIFIED]`. Would need a 2× build + binary diff.
- **P4/Watch correctness:** what happens if a file is modified during `processRebuildQueue` and again during the same plugin's build (i.e., between `await buildSinglePlugin` start and end)? The chokidar event is queued, but `awaitWriteFinish` may still be pending when the rebuild starts → the rebuild reads stale bytes; the second event re-queues correctly so the next cycle is fresh. `[UNVERIFIED]` — race window depends on disk speed and edit cadence.
- **P4/Cleanup:** does `clean()` on Windows actually fail with EBUSY when FXServer holds files open, or does Node's `force: true` somehow unmap the locks? `[UNVERIFIED]` — would need a runtime test.
- **P4/Reload:** the auth reject path returns `{success: false, message: 'HTTP error 401: ...'}`. Does the in-game `core` server emit JSON or plain text on 401? `PluginReloadManager.makeRequest` rejects with the body as a string, then `JSON.parse` fails on the response, but the early `statusCode` check catches it first — the rejection bypasses JSON parsing. `[UNVERIFIED]` end-to-end.
- **P5/Parallelism:** if all `App.tsx`-related blockers are removed, what's the actual speedup of parallel cross-plugin builds? Depends on contention on `npx vite build` cold-starts and on the `[GENERATED]/` filesystem. `[UNVERIFIED]` — would need a benchmark.
