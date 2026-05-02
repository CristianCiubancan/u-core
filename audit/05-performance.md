# P5 — Performance

Performance audit of the U-Core build pipeline + runtime as of `master @ ffae3e5e` (2026-05-02). Severity tags follow CRITICAL / HIGH / MEDIUM / LOW / NIT. `[UNVERIFIED]` marks claims I couldn't confirm from static or runtime evidence.

Prerequisites: `audit/00-inventory.md` and `audit/01-architecture.md` are assumed read.

---

## 1. Cold build wall-clock

Measured with `pnpm build` against current `master`, warm caches, Node v22.20.0, pnpm 10.8.0, Windows 11. **Total: 15.66 s** (logged) / 19.5 s (wall, including pnpm overhead).

| Plugin | Total | Vite (webview) | Notes |
|---|---:|---:|---|
| `core` | 0.08 s | — | server-only, single esbuild call. Fast. |
| `character-edit` | 4.32 s | 2.89 s | **stub `<div></div>` Page.tsx** still triggers full Vite build |
| `character-create` | 6.97 s | 4.79 s | only plugin with real UI |
| `character-select` | 4.48 s | 2.91 s | **stub `<div></div>` Page.tsx** also full Vite build |

### Findings

- **CRITICAL — Two of four plugins are 3-line stubs but each costs a full ~3 s Vite cold start.** `src/plugins/[character]/[auth]/character-select/html/Page.tsx` and `src/plugins/[character]/character-edit/html/Page.tsx` are both `export default function Page() { return <div></div>; }` (verified by Read). Each pays npx → Vite config load → @vitejs/plugin-react → Tailwind init → esbuild dep-prebundle → Rollup → write. `5.80 s of stub builds = 37% of the entire cold build`. **Fix:** in `BuildManager.buildPluginPageTsx` (BuildManager.ts:541-547), short-circuit when the Page.tsx body is structurally empty (parse with esbuild's transform, or just byte-compare to a known-empty template). Or remove the stubs + their `ui_page` until they're real.

- **HIGH — Long pole is webview Vite, not esbuild.** Vite total = 4.79 + 2.89 + 2.91 = 10.59 s = 67% of build time. esbuild's per-file IIFE bundling (20 files for character-create) takes 2-11 ms each per the build log — total esbuild time across all plugins is well under a second. **Optimization budget should focus on Vite.**

- **LOW — Build summary is reported as 15.66 s but pnpm wraps it in another ~4 s of script start-up.** The `pnpm build` → `npx tsx src/scripts/build.ts` chain pays tsx's TS-on-the-fly transform of `BuildManager.ts` (1419 lines) on every invocation. Negligible for one-shot but compounds in CI where each `pnpm <cmd>` is its own process. **Fix:** pre-build `src/scripts/**` to JS once and run with bare node.

---

## 2. Webview Vite builds — sequential cost and parallelization win

`PluginBuilder.buildAll` (build.ts:127) iterates plugins sequentially, and `BuildManager.buildPlugin` (BuildManager.ts:145) `await`s `buildPluginPageTsx` before doing anything else. Each `buildPluginPageTsx` shells out a fresh `npx vite build` subprocess (BuildManager.ts:631-651). **No in-process Vite reuse, no parallelism.**

The reason it has to be sequential is the global `src/webview/App.tsx` mutation (see `audit/01-architecture.md` §1) — every plugin write/restore the same file, so concurrent processes corrupt it.

### Findings

- **HIGH — Theoretical parallel speed-up: ~37% of cold build, 55% of webview cost.** With 3 webview-bearing plugins at 4.79/2.89/2.91 s, parallelizing yields a long pole of 4.79 s (vs. sequential 10.59 s) → savings ≈ 5.80 s on the 15.66 s total. `pnpm build` would drop to ~9.9 s. **Fix:** generate a per-plugin entry file (or use a Vite virtual module) so each plugin has its own entry path and `App.tsx` is no longer a shared mutable file; then `Promise.all` over webview builds.

- **HIGH — Per-plugin Vite cold start is paying the same fixed cost 3× over.** Plugin-react setup, Tailwind config evaluation, dep-prebundle of `react`/`react-dom`/`react-i18next`/`react-icons/*` all repeat. Driving Vite via the JS API in-process (`createBuilder` / `build()`) keeps the prebundle cache hot across plugins — empirically saves 1–2 s per subsequent plugin. Combined with §1's stub-skip, build time would drop to ~5–6 s `[UNVERIFIED]` — needs measurement.

- **MEDIUM — `runViteBuild` uses `spawn(buildCommand, { shell: true })` with `stdio: 'inherit'`** (BuildManager.ts:631-639). `inherit` is fine for human reading but means we can't capture per-plugin build time programmatically — the `Vite v6.3.2 building for production... ✓ built in 4.79s` lines come from Vite, not from the builder. Combined with CLAUDE.md's note about path-injection, this should become `spawn('npx', ['vite', 'build', '--outDir', outputDir], { shell: false })` and capture stdout to a logger.

---

## 3. esbuild config

Single config used in two places: BuildManager.ts:347-362 (TS) and BuildManager.ts:459-472 (JS). Identical except for `loader`. Notable settings:

| Setting | Value | Comment |
|---|---|---|
| `bundle` | `true` | each entry produces a self-contained IIFE |
| `format` | `'iife'` | required by FiveM script loader |
| `target` | `'es2017'` | no minification of newer syntax |
| `minify` | **`false`** | even in prod |
| `sourcemap` | **`'inline'`** | even in prod — base64-embedded into the .js |
| `platform` | `'node'` if path includes `/server/`, else `'browser'` | substring match |
| `external` | hand-maintained Node-builtin list (BuildManager.ts:921-942) | misses `node:` prefix variants |
| code splitting | n/a (IIFE incompatible) | per-file bundles instead |
| watch / context | **never used** | new `esbuild.build()` each call |

### Findings

- **HIGH — `minify: false` even for production builds.** BuildManager.ts:355, 467. There is no env-aware switch. Plugin client/server bundles (90–124 KB each in `character-create/client/*.js`) ship with whitespace, comments, and identifier names. Inline sourcemaps make this much worse — see next finding. FXServer doesn't gain anything from un-minified bundles at runtime (no source-level debugging without a separate dev session). **Fix:** add a `--prod` flag that flips `minify: true` and switches sourcemap to external (`'linked'`) so the .map ships only when wanted.

- **HIGH — `sourcemap: 'inline'` doubles disk and FXServer-load size for production bundles.** `inline` base64-encodes the source map (~133% the size of the source map itself) and appends it to the .js. For the 122 KB `character-create/client/index.js`, ~70-80 KB of that is the inlined map. For unused barrel files (see §4), the inlined map can dwarf the actual code: `html/components/index.js` is 17.6 MB on disk, of which probably 8-10 MB is the base64 sourcemap. **Fix:** `sourcemap: process.env.NODE_ENV === 'production' ? false : 'linked'` (or `'external'` if you always want maps as `.map` siblings).

- **HIGH — `esbuild.build()` is called per-file with no context reuse.** `buildPluginTs` (BuildManager.ts:323-385) loops over every `.ts` file and starts a fresh build context. esbuild's incremental rebuild API (`esbuild.context()`) is not used. For watch mode this means every file change re-allocates esbuild internals from scratch. **Fix:** for watch, hold `ctx = await esbuild.context({...})` and call `ctx.rebuild()` on change. esbuild docs claim 5-10× speedup on incremental rebuilds. For one-shot builds, switch to a single `esbuild.build({ entryPoints: [...] })` call with all entries at once — esbuild parallelizes internally and shares parsed-AST work.

- **HIGH — `bundle: true` per-file means `react`/`react-dom` get inlined into every `.ts` file under `html/**` that imports them.** A barrel re-export in `html/components/index.ts` causes esbuild to bundle React+JSX runtime + all dependent components into a 17.6 MB IIFE — even though that file is never loaded by FXServer (manifest says `client_scripts: ["client/*.js"]`, not `html/components/index.js`). See §4 for full table. **Fix:** drive bundling from manifest entry points, not from a tree-walk.

- **MEDIUM — `getExternalPackages` (BuildManager.ts:921-942) is a hand-maintained allowlist of bare Node builtins.** Modern code uses `node:` prefix (`import 'node:fs'`); these are not matched and esbuild attempts to bundle them (then fails or stubs them as polyfills). **Fix:** `external: [/^node:/, ...require('module').builtinModules]`.

- **NIT — `loader` map only configures `.ts` → `'ts'` and `.js` → `'js'`.** TSX is handled separately via Vite, but `.json` imports (e.g., `variations.json` from `getClothingImage.ts:172`) fall through to esbuild's default JSON loader, which works but inlines the entire JSON into the bundle. The 87 KB `variations.json` thus appears inside both the source `shared/variations.json` (copied verbatim) and possibly inlined into bundles that reference it. `[UNVERIFIED]` — would need to grep the IIFE for `Object.freeze({...})`.

---

## 4. Bundle-size table

Measured directly from `txData/CFXDefaultFiveM_0838A6.base/resources/[GENERATED]/**`. **All sizes are post-build, on-disk bytes, including inlined sourcemaps.**

### What FXServer actually loads

Per `plugin.json`, only `client/*.js`, `server/*.js`, and `html/index.html` (+ its referenced `html/assets/**`) are loaded by the resource. Everything else under `html/**` is served as a static file but only fetched if the page references it.

| Plugin | client total | server total | html/index.html | html/assets/index-\*.js | html/assets/vendor-\*.js | html/assets/index-\*.css | webview total |
|---|---:|---:|---:|---:|---:|---:|---:|
| `core` | 0 | 85 KB | n/a | n/a | n/a | n/a | n/a |
| `character-edit` | 0.19 KB | 0.19 KB | 0.8 KB | 7.4 KB | 233 KB | 226 KB | **466 KB** |
| `character-select` | 0.19 KB | 0.19 KB | 0.8 KB | 7.4 KB | 233 KB | 226 KB | **466 KB** |
| `character-create` | 509 KB ¹ | 47 KB | 0.8 KB | 81 KB | 248 KB | 226 KB | **555 KB** |

¹ character-create ships 6 client/*.js files: index 122 KB, events 117 KB, ui 97 KB, camera 88 KB, character-manager 70 KB, utils 1 KB.

### Loose `.ts` files emitted by esbuild but **NEVER loaded** (pure waste)

These are barrel and helper TS files under `html/**` that the build pipeline picks up via tree-walk (BuildManager.ts:310-313) and bundles into IIFEs. The manifest does not reference them. They sit on disk and add to FXServer scan time.

| File | Size | What it is |
|---|---:|---|
| `html/components/index.js` | **17.6 MB** | barrel re-exporting all React tabs/components |
| `html/components/tabs/ClothingTab/index.js` | **12.0 MB** | barrel re-exporting ClothingTab subtree |
| `html/utils/getClothingImage.js` | 348 KB | inlines React + variations.json |
| `html/hooks/index.js` | 219 KB | barrel of all hooks |
| `html/hooks/useTextureVerification.js` | 181 KB | inlines React |
| `html/hooks/useDrag.js` | 158 KB | inlines React |
| `html/components/common/index.js` | 156 KB | barrel inlining `Slider`/`TabButton`/`TabLayout`/`IconWrapper` from webview |
| `html/hooks/useImageLoader.js` | 148 KB | inlines React |
| `html/hooks/useInfiniteScroll.js` | 145 KB | inlines React |
| `html/utils/safeTextureUpdate.js` | 51 KB | |
| `html/utils/textureVerification.js` | 31 KB | |
| `shared/store.js` | 23 KB | |
| `shared/types.js` | 15 KB | type-only file, still bundled |
| **Total dead bundles** | **~31.4 MB** | |

### Findings

- **CRITICAL — The TS bundler emits ~31 MB of dead IIFEs per `character-create` build.** The two largest (29.6 MB combined) are barrel files that recursively re-export the entire React tree, so esbuild inlines React + ReactDOM + react-icons + tailwind-built CSS imports + every component into each barrel. Nothing in `client_scripts`/`server_scripts`/`ui_page`/`files` actually points at them — they're dead disk, dead FXServer-scan-time, and dead deploy bandwidth. **Fix:** drive `buildPluginTs` from `plugin.json`'s `client_scripts`/`server_scripts`/`shared_scripts` patterns as entry points, not from a flat `plugin.files.filter(...endsWith('.ts'))` walk. The webview Vite build already produces the right artifacts in `html/assets/`.

- **HIGH — Stub plugins ship 466 KB of vendor + CSS each, identical bytes 3× over.** `character-edit` and `character-select` have empty `<div></div>` Page.tsx but the Vite output still includes `vendor-*.js` (233 KB — React + ReactDOM + i18next + react-icons references) and `index-*.css` (226 KB — full Tailwind safelist build). The `index-s6-FhpLX.css` filename is byte-identical across all three plugins (verified — same 226333 bytes in all three dirs), meaning **the same Tailwind CSS is being rebuilt and copied 3 times**. **Fix:** (a) skip stubs (see §1); (b) longer-term, ship a single shared vendor + CSS at a stable URL and have each plugin's HTML reference it.

- **HIGH — 226 KB of CSS for an unminified Tailwind build is 5-10× larger than necessary.** `safelistUtils.ts` generates `~14 palettes × 11 shades × 8 modifiers = 1232` color classes plus glass/scrollbar/accessibility variants — and Tailwind appears to be running without `cssnano` / minification. Tailwind v3.4 in production mode does minify by default *if* called via `tailwindcss build` directly, but here it's invoked through Vite's PostCSS pipeline; `vite.config.ts` does not configure `cssMinify` and Vite's default is `'esbuild'` which is on by default — so the 226 KB is post-minify. The bloat is the safelist. **Fix:** trim `safelistUtils.ts` to only the palettes the app actually uses (current `appConfig.ts` selects `indigo`/`zinc` — generating safelist for all other palettes is wasted). `[UNVERIFIED]` would need to confirm Vite's CSS minify is actually running by inspecting bytes around long class chains.

- **MEDIUM — `vendor-*.js` is 233-248 KB.** React 19 + ReactDOM 19 + i18next + react-i18next minified gzipped is normally ~50 KB; un-gzipped ~150 KB. 233 KB suggests minify is on but the bundle includes more than necessary (devtools, react-icons subset selectors, the entire `i18n.ts` resource bundle even when no plugin uses it). **Fix:** verify Vite's `manualChunks` is not pulling in dev-only React paths; lazy-load `i18n.ts` if not used.

- **MEDIUM — Inline sourcemaps balloon client bundles.** `character-create/client/index.js` is 122 KB. Stripping the inline `//# sourceMappingURL=data:application/json;base64,...` line typically halves it. Across the 6 client files (~509 KB total), an estimated 250-300 KB is base64 sourcemap. FXServer loads this on every resource start. **Fix:** see §3, switch sourcemaps to external `.map` files.

- **MEDIUM — `shared/variations.json` is 87 KB and is both copied verbatim *and* inlined into `getClothingImage.js` (348 KB).** `getClothingImage.ts:172` does `import variations from '../../shared/variations.json'` which esbuild bundles. The verbatim copy is fine; the bundle inlining is fine; but bundling that into a *barrel* (`html/components/index.js` re-exports getClothingImage) duplicates the JSON inside multiple dead bundles. **Fix:** moot once §4's dead-bundle issue is fixed.

- **NIT — `core/server/index.js` is 85 KB despite no node_modules imports.** That's unusually large for a self-contained HTTP server (~700 lines source). Explanation: inline sourcemap + the bundle pulls in all of `@citizenfx/server` types-as-runtime-stubs `[UNVERIFIED]`. Worth confirming with `--analyze`.

---

## 5. Tree-shaking and deep imports

Surveyed `src/plugins/**` and `src/webview/**` for problematic import patterns.

### Findings

- **GOOD — `react-icons` imports are subpath-shaped.** Verified via grep: `react-icons/fa6`, `react-icons/md`, `react-icons/gi`, `react-icons/fa`. These are the correct tree-shakeable subpaths; Vite/Rollup will keep only the named icons. No `from 'react-icons'` root imports found.

- **GOOD — No `lodash` root imports anywhere.** `import _ from 'lodash'` would be ~70 KB; verified by grep: zero matches in `src/`. (Aside: `lodash` is in `package.json` deps but nothing imports it — see audit/00-inventory.md §4.)

- **GOOD — No `moment.js`, no `date-fns` (full-package import), no `@material-ui/icons` (full-import).** Verified by grep on dependency manifests.

- **MEDIUM — `react-i18next` is bundled but no plugin's webview actually uses translations.** `src/webview/i18n.ts` ships hardcoded en/es bundles into every plugin's webview (`vendor-*.js` ~233 KB), but `src/plugins/**` has zero `useTranslation()` calls (verified by grep: 0 matches). Each plugin pays ~30-40 KB of compressed i18next + react-i18next + the en/es JSON for nothing. **Fix:** lazy-load i18n via `import('./i18n')` only when a plugin's Page.tsx opts in, or strip i18n entirely until a plugin actually uses it.

- **MEDIUM — Plugin `translations/{en,ro}.json` files are 0 bytes** (verified — all six are empty files). The webview's hardcoded en/es resources are unrelated. So translations are wired *into Vite's bundle* (en+es) but the plugins' own `translations/` directories are decoy infrastructure that the build copies verbatim and FXServer may serve. **Fix:** either populate them and replace the i18n.ts hardcoded bundles, or delete.

- **LOW — Deep relative imports across `webview/` from plugins (5–7 `..` segments).** `Page.tsx:2` does `../../../../../webview/hooks/useNuiEvent`. Vite resolves this fine (no perf cost) — flagged for maintainability not perf. Already covered in audit/01-architecture.md §4.

---

## 6. Watch mode latency

Static analysis only — running `pnpm dev` would hold a long-lived watcher; relevant constants and code paths verified directly.

### Findings

- **HIGH — Single-file change rebuilds the entire plugin (full Vite + all 20 esbuild calls) for `character-create`.** Watch handler at build.ts:307-336 maps a changed file to its plugin, adds to `rebuildQueue`, and `processRebuildQueue` calls `buildSinglePlugin` → `BuildManager.buildPlugin` → full pipeline including `buildPluginPageTsx` (Vite!). A 1-byte tweak to `client/utils.ts` triggers the same ~7 s rebuild as a fresh build. **Fix:** detect file → kind (TS-server / TS-client / Page.tsx / asset) and only run that step. Page.tsx changes need Vite; client `.ts` changes only need that one esbuild call.

- **HIGH — esbuild contexts are not reused across rebuilds.** Each `processRebuildQueue` (build.ts:220) calls `BuildManager.buildPlugin` which calls `esbuild.build({...})` per file (BuildManager.ts:349). esbuild's recommended pattern for watch is `esbuild.context({...})` once and `ctx.rebuild()` per change — caches plugins, AST, and reuses the daemon. **Fix:** hold a `Map<filePath, esbuild.BuildContext>` for the duration of the watch session.

- **HIGH — Vite is not reused across rebuilds either.** Every Page.tsx change spawns a fresh `npx vite build` subprocess. Vite's design is to be a long-running dev server (HMR) or a one-shot bundler — using it as a CLI per change pays full startup every time. **Fix:** use the JS API; `const builder = await createBuilder(viteConfig); builder.buildApp()` and reuse across rebuilds. Even better: use Vite's `build --watch` mode (rollup-watch under the hood) for the production-style build.

- **MEDIUM — chokidar's `awaitWriteFinish.stabilityThreshold: 300` (build.ts:210) and the manual debounce timer of 300 ms (build.ts:331) compound** — minimum delay between file save and rebuild start is ~600 ms. Documented `DEBOUNCE_TIME` env var exists in `.env.example` but is never read (audit/00-inventory.md §6). **Fix:** plumb the env var through, or reduce stabilityThreshold (100 ms is plenty on most editors).

- **MEDIUM — Reload manager call is sequential per plugin** (build.ts:273-291). After rebuild, `for (const plugin of plugins) await reloadPlugin(...)` issues HTTP requests one at a time. With multiple plugins changed in one debounce window, total latency = N × HTTP RTT. **Fix:** `Promise.all(plugins.map(reloadPlugin))`.

- **LOW — `findPluginForPath` (build.ts:348-366) does an O(N) linear scan over all plugins per file event.** With chokidar firing potentially hundreds of events during a `git checkout`, this is N×M. For 4 plugins it's irrelevant; for >50 plugins worth measuring `[UNVERIFIED]`. **Fix:** maintain a sorted prefix tree once at scan time.

- **LOW — `awaitWriteFinish.pollInterval: 100`** (build.ts:211) means chokidar polls *all watched files* every 100 ms while writes are settling. On Windows, where chokidar already falls back to polling occasionally for some filesystems, this can spike CPU during large saves. Not a hot path but worth noting.

---

## 7. Docker image

Single-stage `Dockerfile` based on `ubuntu:20.04`. Used **only for FXServer**, not for the build pipeline (which runs on the host). 31 lines total.

```
FROM ubuntu:20.04
RUN apt-get update && apt-get install -y git curl tar xz-utils && rm -rf /var/lib/apt/lists/*
ARG BINARIES_ARCHIVE_URL=...
RUN mkdir -p /root/binaries && curl -L "$BINARIES_ARCHIVE_URL" -o /tmp/fx.tar.xz && tar -xf /tmp/fx.tar.xz -C /root/binaries && rm /tmp/fx.tar.xz
RUN chmod +x /root/binaries/run.sh
CMD ["/root/binaries/run.sh"]
```

### Findings

- **HIGH — `ubuntu:20.04` (LTS EOL April 2025) is the base image.** Audit run on 2026-05-02; Ubuntu 20.04 has been EOL for >12 months. No security patches for unpatched CVEs. **Fix:** bump to `ubuntu:24.04` or — better for size — `debian:12-slim`.

- **HIGH — `RUN apt-get update && apt-get install ... && rm -rf /var/lib/apt/lists/*` is one layer (good), but `RUN curl ... | tar -xf ...` is a separate layer that fetches the FXServer archive every time `BINARIES_ARCHIVE_URL` changes** — and changes nothing else, but the apt layer above is invalidated only when the Dockerfile string itself changes. Not a bug, but the layer ordering is suboptimal because the curl URL is the most volatile arg yet sits below the relatively-stable apt step. Fine as-is. **NIT:** consider downloading binaries via `ADD <url> ...` to use Docker's URL caching, or via build cache mount.

- **HIGH — No multi-stage build. The fetched `fx.tar.xz` is removed (`rm /tmp/fx.tar.xz`) in the same `RUN` so it doesn't bloat the layer, but `xz-utils` and `curl` remain installed in the final image** even though they're only needed at build time. **Fix:** two-stage:
  ```
  FROM ubuntu:24.04 AS fetch
  RUN apt-get install -y curl xz-utils && curl -L ... | tar -xf - -C /binaries
  FROM ubuntu:24.04
  COPY --from=fetch /binaries /root/binaries
  ```
  Saves ~50-80 MB from final image `[UNVERIFIED]` — depends on FXServer payload size.

- **HIGH — `node_modules` is not cached because the build runs on the host, not in the container.** This is intentional (`pnpm build` writes directly to `txData/...` which is volume-mounted into the container). But it means the only thing in the container is FXServer; there's no Docker-based reproducibility for the build itself. **Fix:** consider adding a separate builder image (`node:22-alpine` + `pnpm install` + `pnpm build`) for CI.

- **MEDIUM — `docker-compose down && docker-compose up -d --build` (`pnpm start:docker`)** rebuilds the image every time. Combined with `BINARIES_ARCHIVE_URL` mismatch between Dockerfile default (`14482-1eed77dd...`) and `.env.example` (`13890-ad6c90072e62...`) — see audit/00-inventory.md §4 — operators get a fresh download on every restart. **Fix:** pin the URL, use a volume cache.

- **LOW — `restart: unless-stopped` on both services** is fine, but `db` (mariadb:10.5) is also EOL (June 2025). Bump to `10.11` or `11.4`.

- **NIT — `mariadb:10.5` exposes 3306 to the host.** Not a perf issue but worth noting (covered in P1 security).

---

## 8. Asset server

Standalone `asset-server/server.js` (~263 lines, Express 4). Runs on port 3000 by default. Only one consumer in this repo: `character-create/html/utils/getClothingImage.ts` builds URLs like `/assets/{quality}/{path}.png`.

### Cache strategy

- `Cache-Control: public, max-age=86400` set explicitly per response (line 95, 125, 133, 155, 163, 184).
- ETag and Last-Modified are set by Express's `res.sendFile` → `send` library defaults (`etag: 'weak'`, `lastModified: true`). Conditional `If-None-Match` / `If-Modified-Since` handling works.
- `compression()` middleware at `level: 6` (gzip).

### Findings

- **HIGH — `compression()` runs on every response, but `compressible` lib correctly skips `image/png` / `image/jpeg`** (it returns `false` for known-binary types). So gzip CPU is not wasted on PNGs. **However**, no Brotli, no pre-compression, no WebP/AVIF negotiation. For an image-heavy clothing CDN this matters. **Fix:** generate `.webp`/`.avif` variants at optimization time and serve via `Accept` header negotiation; serve `.br` pre-compressed for HTML/CSS/JS.

- **HIGH — `fs.existsSync` is called synchronously inside every request handler** (lines 90, 120, 123, 146, 153, 179). Blocking syscall on the event loop per request. Under load this serializes I/O. **Fix:** drop the existence check entirely (let `res.sendFile` 404) or use `fs.promises.access`.

- **MEDIUM — `cacheMaxAge` is read as `process.env.CACHE_MAX_AGE || 86400`** (line 19). If the env var is set, it's a *string* (`'86400'`) not a number; the template literal `max-age=${config.cacheMaxAge}` works but `+config.cacheMaxAge` (numeric coercion) doesn't happen anywhere. Cosmetic.

- **MEDIUM — No `immutable` directive on the Cache-Control.** Image filenames look content-addressable from the URL (`female_11_5_0.png` — model+componentId+drawableId+textureId), so they're effectively immutable. Adding `, immutable` would let browsers skip revalidation entirely for the year. **Fix:** `Cache-Control: public, max-age=31536000, immutable`.

- **MEDIUM — Wildcard route `/assets/:quality/*` (line 73) is vulnerable to path traversal via `..` in `req.params[0]`.** Express decodes URLs but `path.join(publicDir, quality, assetPath)` resolves outside `publicDir` if `assetPath` contains `../../etc/passwd`. **Fix:** `path.relative(publicDir, resolved).startsWith('..')` check, or use `res.sendFile` with `{ root: publicDir }` which adds the safety check. (Cross-listed under P1 security — performance impact is the file-walk cost on the traversal attempt.)

- **LOW — `/thumbnails/*` and `/assets/*` routes have nearly identical 25-line handler bodies** (lines 73-99, 102-137, 140-167, 170-188). Every request goes through the same fs.existsSync + sendFile pattern. **Fix:** factor into a helper.

- **LOW — Logging middleware (line 37) logs every request via `console.log`** with no log level. In production this is a stdout-bandwidth bottleneck under high QPS. **Fix:** use morgan or pino with sampling, or remove for prod.

- **LOW — Asset-server is **not** part of the FiveM build pipeline.** It's a runtime image CDN, only used by `getClothingImage.ts`. The `pnpm start:assets` script does `cd asset-server && npm install && npm start` separately. Confirmed: no references to asset-server from `BuildManager` or `build.ts`. So compilation timing is unaffected by it.

- **LOW — `image-js` is in root `package.json` deps but not referenced anywhere in `src/` or `asset-server/`** (cross-confirmed in audit/00-inventory.md §4). The asset-server uses `sharp` (per `asset-server/package.json`), not `image-js`. **Fix:** drop `image-js` and `canvas` from root deps if neither is reachable.

---

## 9. Translations / i18n bundling

`src/webview/i18n.ts` declares en + es resource bundles (~70 keys each, ~7 KB total source). Initialized in `src/webview/main.tsx:7` via `import './i18n'` — eagerly executed for every webview entry.

### Findings

- **MEDIUM — All locales are bundled into every plugin's vendor chunk.** Vite sees `import './i18n'` and includes both en + es resources in the eager critical-path bundle. Even the stub plugins ship en+es. With 3 webview-bearing plugins, that's 3× the i18n payload across resources. **Fix:** dynamic-import the locale resources keyed by `i18n.changeLanguage()`, e.g. `import(`./locales/${lng}.json`)` so Vite splits per locale. Or lazy-load i18n entirely per §5.

- **MEDIUM — Plugin `translations/{en,ro}.json` are 0-byte files** that ship to `txData/.../translations/`. Verified — all 6 are zero bytes. They're not loaded by anything (i18n bundles are hardcoded in `i18n.ts`). The infrastructure is half-wired; the size cost is zero but the disk-walk cost during `chokidar` scan is non-zero. **Fix:** either populate and switch i18n.ts to consume them, or delete them and the `translations: ["translations/*.json"]` files in plugin.json.

- **LOW — `useSuspense: false`** (`i18n.ts:153`) is correct for the FiveM NUI environment but means the first render shows untranslated keys briefly. With 70 keys × 2 locales the bundle is small enough that it's loaded synchronously by the time React paints, so probably no visible flash `[UNVERIFIED]` — would need browser timing.

---

## 10. React webview runtime — anti-patterns

Reviewed `character-create/html/**` (the only non-stub Page.tsx) and `src/webview/**` for runtime perf smells.

### Findings

- **HIGH — `CharacterDataProvider` `contextValue` is recreated on every render** (`CharacterDataContext.tsx:421-436`). The object literal `{ ...state, setActiveTab, ... }` gets a new identity per render of the provider, causing every consumer of `useCharacterData()` (every tab, every clothing item, every form input) to re-render even when only one slice changed. With `useReducer` already in place (line 254), the callbacks are stable but the spread plus the wrapper object are not. **Fix:** wrap in `useMemo(() => ({...state, ...callbacks}), [state, ...callbacks])`. Or split into two contexts: state and dispatch — the dispatch context is reference-stable forever.

- **HIGH — `ClothingGrid` calls `Array.from({ length: category.maxItems }, (_, i) => i)` on every render** (`ClothingGrid.tsx:24`). For a clothing category with `maxItems: 500`, that's a fresh 500-element array allocation per render of `ClothingGrid`, and `useInfiniteScroll` then `slice`s it on every render too (`useInfiniteScroll.ts:74`). **Fix:** `useMemo(() => Array.from({length: category.maxItems}, (_, i) => i), [category.maxItems])`. The current memoization story relies entirely on `ClothingItem`'s explicit `memo` (ClothingItem.tsx:179-188), which is correct but doesn't save the parent re-render cost.

- **HIGH — `useInfiniteScroll` artificially delays `loadMore` with `setTimeout(..., 50)`** (`useInfiniteScroll.ts:37-43`). The comment says "to simulate loading time and prevent UI freezes" — but there is no async source; it's purely a synthetic latency. Each user scroll → 50 ms idle → setState → re-render. **Fix:** remove the `setTimeout`; the only legit reason would be to rate-limit setState during fast scrolls, which is what the `isLoading` guard on line 32 already does.

- **MEDIUM — `Page.tsx:74` and similar render `<FaceTab />`/`<HairTab />` etc. as `activeTab === 'face' && <FaceTab />`.** Switching tabs unmounts the previous tab entirely — losing scroll position, network state, and any local state in clothing tabs. Not a perf bug, a UX one — but performance-relevant because each switch reruns `useEffect` chains that fetch images (clothing tab loads many images on mount). **Fix:** keep all tabs mounted with `display: none` toggling, or persist transient state in context.

- **MEDIUM — Empty arrow function as initial useRef value** (`useNuiEvent.ts:88-90`): `useRef<(data: T) => void | Promise<void>>((_data: T) => {})`. Allocates a closure per `useNuiEvent` call site. Negligible per call but `useNuiEvent` is called ~5x in character-create. **Fix:** `useRef<...>(undefined)` and null-check in the wrapper.

- **MEDIUM — `useNuiEvent` registers its `eventListener` once globally and never tears down** (`useNuiEvent.ts:39-44`). Already flagged in audit/00-inventory.md §3 LOW; restating because if the webview is HMR-reloaded (as it would be during `pnpm dev`), the listener leaks. Each rebuild adds a new listener bound to a different React tree. Memory creeps.

- **LOW — `i18n.ts` initialization is synchronous and runs at module import** (`i18n.ts:143-155`). Every webview blocks first paint on i18next init. `useSuspense: false` mitigates display-time, but the JS work still runs. Sub-1ms in practice.

- **LOW — `ClothingItem`'s `memo` second arg is a manual prop comparator** (`ClothingItem.tsx:179-188). Lists every prop explicitly, omitting `onSelectDrawable` (which is unstable — created in `ClothingGrid.tsx:76` as `() => onSelectDrawable(drawableId)`). Result: callback prop changes never trigger re-render, which works *only because* the underlying `onSelectDrawable` is captured via closure. Fragile — adding any prop requires updating the comparator. **Fix:** drop the comparator, use default `Object.is` shallow compare, and stabilize `onSelectDrawable` with a `useCallback` keyed by `drawableId` in `ClothingGrid`. `[UNVERIFIED]` — the current behavior may be intentional optimization.

- **LOW — `index-s6-FhpLX.css` is a 226 KB monolithic stylesheet** loaded synchronously in every plugin's `<head>`. Critical CSS extraction or per-tab CSS splitting would help first-paint, but for an in-game NUI overlay (where the webview is never the user's first impression — the game is) this is barely visible.

---

## Top 5 risks

1. **CRITICAL — Tree-walked `.ts` bundling produces ~31 MB of dead IIFEs per `character-create` build (17.6 MB + 12 MB + 12 smaller).** Barrel files in `html/components/`, `html/hooks/`, `html/utils/` get bundled with React + JSX inlined, then sit on disk unreferenced by the manifest. Fix: drive `buildPluginTs` from `client_scripts`/`server_scripts` patterns, not a flat tree-walk. **One change collapses dead bundles AND fixes the `shared/` path-misclassification from audit/01-architecture.md §3.** [§4]

2. **HIGH — Stub Page.tsx files cost 5.8 s of cold build time (37% of total) for no UI.** `character-edit` and `character-select` are `<div></div>` placeholders that still trigger full Vite cold starts each. Skipping them drops `pnpm build` from 15.7 s → ~9.9 s; combined with parallelizing the remaining Vite calls, ~5.5 s. [§1, §2]

3. **HIGH — `minify: false` + `sourcemap: 'inline'` for production builds.** Doubles client-bundle size (~250-300 KB of base64 sourcemaps in 509 KB of `character-create/client/*.js`) and ships unminified code to FXServer. No prod/dev switch in `BuildManager`. Fix: an env-driven flag. [§3]

4. **HIGH — esbuild and Vite are recreated per file change in watch mode.** No `esbuild.context().rebuild()`, no Vite JS-API reuse — every change shells out a new `npx vite build`. A 1-byte tweak to one client file rebuilds the whole plugin including a fresh Vite cold start. Fix: hold contexts across rebuilds; route changes by file kind. [§3, §6]

5. **HIGH — Vendor + 226 KB CSS are duplicated 3× across plugins because there's no shared resource.** Each plugin's webview ships its own `vendor-*.js` (233 KB) and `index-*.css` (byte-identical 226 KB across all three). Combined with `useTranslation()` having zero callers but `react-i18next` still in the vendor chunk, ~50% of every plugin's webview payload is unused or duplicated. [§4, §5, §9]

---

## Open questions

- Does Vite's `cssMinify` actually run for the per-plugin builds? Bundle-byte inspection (Brotli sizes, in particular) would confirm `[UNVERIFIED]`.
- What's the FXServer cold-start time scaling with the dead `.ts` IIFE files in `html/`? Resource scan walks the tree; whether it parses the `.js` files or just stats them affects the cost. `[UNVERIFIED]` — would need to instrument FXServer.
- Does `core/server/index.js` actually pull in `@citizenfx/server` types/runtime stubs or just compile-time types? Bundle-analyze would tell. `[UNVERIFIED]`.
- Are the inlined `variations.json` (87 KB) instances inside dead bundles still loaded by FXServer's manifest scan? If FXServer reads `files: ["html/**/*"]` lazily on first NUI fetch, the dead bundles cost 0 RAM until accessed. `[UNVERIFIED]`.
- What's the actual end-to-end watch latency from `Ctrl-S` → in-game resource restart? Static analysis says ~600 ms debounce + 7 s rebuild + HTTP RTT, but real-world includes filesystem-event jitter. `[UNVERIFIED]`.
