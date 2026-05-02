# P0 — Inventory & Baseline

Read-only inventory of the U-Core repo as of `master @ ffae3e5e` (2026-05-02). Severity tags follow CRITICAL / HIGH / MEDIUM / LOW / NIT. `[UNVERIFIED]` marks claims that would need a runtime check.

---

## 1. Plugins

Discovered by `FileManager.scanPlugins` via `glob('src/plugins/**/plugin.json')`. Bracket-wrapped folders (`[default]`, `[character]`, `[auth]`) are FiveM grouping conventions, not plugins.

| # | Bracket path | Name | client/ | server/ | shared/ | html/Page.tsx | translations/ | plugin.json fields used |
|---|---|---|---|---|---|---|---|---|
| 1 | `[default]/` | `core` | ✗ | ✓ (`server/index.ts`) | ✗ | ✗ | ✗ | `name`, `version`, `fx_version`, `games`, `author`, `description`, `server_scripts` |
| 2 | `[character]/[auth]/` | `character-create` | ✓ (6 files) | ✓ | ✓ (`store.ts`, `types.ts`, `variations.json`) | ✓ (extensive — tabs, hooks, context) | ✓ (en, ro) | `name`, `version`, `fx_version`, `author`, `description`, `games`, `client_scripts`, `server_scripts`, `files`, `ui_page` |
| 3 | `[character]/[auth]/` | `character-select` | ✓ (`index.ts` only) | ✓ | ✗ | ✓ (stub: `<div></div>`) | ✓ (en, ro) | same as #2 |
| 4 | `[character]/` | `character-edit` | ✓ (`index.ts` only) | ✓ | ✗ | ✓ (stub: `<div></div>`) | ✓ (en, ro) | same as #2 |

### Plugin findings

- **MEDIUM — Stub Page.tsx files still trigger full Vite builds.**
  Files: `src/plugins/[character]/[auth]/character-select/html/Page.tsx`, `src/plugins/[character]/character-edit/html/Page.tsx`. Both are 3-line `<div></div>` placeholders, but `BuildManager.buildPluginPageTsx` (BuildManager.ts:527) runs a full `vite build` for them, including the App.tsx swap dance. Each stub costs a sequential webview build per `pnpm build` and per `pnpm dev` rebuild. **Fix:** skip webview build when the Page.tsx is structurally empty, or remove the stubs and `ui_page` until they're real.

- **LOW — Plugins import deeply into `src/webview/...` from `html/Page.tsx`.**
  E.g. `src/plugins/[character]/[auth]/character-create/html/Page.tsx:2-3` does `../../../../../webview/hooks/useNuiEvent`. Five levels of `..` is fragile to bracket-folder reorganization. **Fix:** add a `tsconfig` paths alias (`@webview/*`) in `tsconfig.webview.json` and Vite.

- **LOW — Only one plugin uses `shared/`.** Only `character-create` has a `shared/` folder; others duplicate types inline or skip them. Convention is unenforced.

- **NIT — Translations only en/ro and only on character-* plugins.** `core` has no translations. The webview also has its own hardcoded en/es resources in `src/webview/i18n.ts` that are not derived from any plugin's `translations/` JSON.

---

## 2. Build tooling — `src/scripts/**`

| File | Purpose |
|---|---|
| `build.ts` | CLI entry. Parses flags (`--watch`, `--no-clean`, `--log-level`, `--plugins-dir`, `--dist-dir`, `--stop-on-error`), constructs `PluginBuilder`, runs `buildAll()`, optionally starts a chokidar watcher. Default `distDir` is hardcoded to `txData/${SERVER_NAME}/resources/[GENERATED]`. |
| `managers/BuildManager.ts` | Owns the build pipeline. Per plugin: awaits `buildPluginPageTsx` (Vite), then `Promise.all` of Lua copy, JSON copy, TS bundle (esbuild IIFE), JS bundle, fxmanifest gen, other-files copy. Handles App.tsx swap/restore, server-vs-client detection by path substring, fxmanifest emission (incl. `getCustomProperties` passthrough). |
| `managers/FileManager.ts` | Discovers plugins, walks file tree (skips only `node_modules`), maintains `plugins`/`files`/`pathToPlugin` maps. Loads/parses plugin manifests with try-catch fallback to `{name: dirname}`. Also implements unused CRUD: `createPlugin`, `removePlugin`, `writeFile`, `deleteFile`, `copyFile`, `reloadPlugin`. |
| `managers/ManifestManager.ts` | **DEAD CODE.** Defined and exported but never imported anywhere outside itself. Manifest loading is duplicated inline in `FileManager.scanPlugins`. |
| `managers/PluginManager.ts` | **DEAD CODE.** Thin facade over FileManager; never imported outside itself. |
| `managers/PluginReloadManager.ts` | HTTP client. POSTs to `http://localhost:3414/restart?resource=...` with `Authorization: Bearer ${RELOADER_API_KEY}`. Uses bare `http`/`https` modules (no fetch/undici). |
| `types/Plugin.ts` | `Plugin` interface (pluginName, fullPath, displayPath, parents[], files[], manifest?). |
| `types/Manifest.ts` | `PluginManifest` (full schema) + `BasicPluginManifest` (name only). Has `[key: string]: any` index signature. |
| `types/File.ts` | `File` interface (fileName, fullPath, displayPath, plugin). |

### Build-tooling findings

- **HIGH — `ManifestManager` and `PluginManager` are unreachable code.**
  Files: `src/scripts/managers/ManifestManager.ts` (entire file), `src/scripts/managers/PluginManager.ts` (entire file). Verified by grep: only self-references. `BuildManager` is constructed directly with `FileManager` in `build.ts:75`. ~500 lines of duplicated manifest parsing/validation logic that drifts silently. **Fix:** delete or wire in.

- **HIGH — Auto-reload watcher in `[default]/core` watches a stale path.**
  `src/plugins/[default]/core/server/index.ts:17` `const WATCH_PATHS = ['dist'];`. The build pipeline writes to `txData/${SERVER_NAME}/resources/[GENERATED]/...`, never `dist/`. The polling loop (every 2s, `checkForChanges`) is therefore a no-op in production. The HTTP `/restart` endpoint still works; the file-watcher half is dead. **Fix:** delete the file-watcher, or point it at the actual resources tree.

- **HIGH — `buildPlugin` overrides webview build then awaits *before* the parallel work.**
  `BuildManager.ts:145` awaits `buildPluginPageTsx` (which mutates `src/webview/App.tsx`), then `Promise.all` of TS/JS/Lua/JSON/manifest/other. While the App.tsx swap is contained in `buildPluginPageTsx` (try/finally restores), nothing prevents two concurrent `BuildManager` instances. The single-process `PluginBuilder` calls `buildSinglePlugin` sequentially (build.ts:127), but a second `pnpm dev` would race. **Fix:** add a process-level lockfile, or move per-plugin build state out of `src/webview/`.

- **MEDIUM — App.tsx restore is conditional on prior content existing.**
  `BuildManager.ts:570-608`. If `App.tsx` doesn't exist before the build, `originalAppContent === ''` and the `finally` block skips restoration, leaving the auto-generated stub in `src/webview/App.tsx`. The current repo state shows exactly this leak: `App.tsx` content is "Auto-generated by BuildManager / Generated on 2025-05-01T23:57:25.505Z" referencing `[character]/[auth]/character-create/html/Page.tsx`. The CLAUDE.md warns "never edit App.tsx" precisely because of this. **Fix:** always write a sentinel App.tsx in the finally.

- **MEDIUM — Vite invocation via `spawn(buildCommand, { shell: true })` interpolates `outputDir` into the command string.**
  `BuildManager.ts:631-639`. Plugin name is part of `outputDir`. If a plugin folder ever contained shell metacharacters (space, `;`, backticks), this would shell-inject. Plugin names are dev-controlled, so practical risk is low, but the pattern is wrong. **Fix:** pass args as an array (`spawn('npx', ['vite', 'build', '--outDir', outputDir])`) — no shell.

- **MEDIUM — Server-vs-browser detection is a substring match.**
  `BuildManager.ts:911` `filePath.includes('/server/') || filePath.includes('\\server\\')`. Any path containing `/server/` (e.g., a `client/server-utils/` folder, or a temp path like `/tmp/server/...`) is misclassified. Documented in CLAUDE.md as a known footgun. **Fix:** check that `server` is a *direct child of the plugin root* (path segment, not substring).

- **MEDIUM — `getExternalPackages` lists Node built-ins by name only; modern code uses `node:` prefix.**
  `BuildManager.ts:921-942`. Imports like `import * as fs from 'node:fs'` would not be marked external and esbuild would try to bundle them. **Fix:** include `node:` variants or use `external: [/^node:/]` pattern.

- **MEDIUM — `noUnusedLocals: true` clashes with `composite: true` in plugins tsconfig.**
  `tsconfig.plugins.json:14` enables `noUnusedLocals` but plugin code under `client/` regularly imports unused types for ambient declaration. Practical impact: TBD `[UNVERIFIED]` — would need a `tsc --build` run to confirm.

- **LOW — `tsconfig.plugins.json` `include` references nonexistent `src/core/**/*`.**
  Line 19: `"./src/core/**/*"`. `src/core/` does not exist. Stale.

- **LOW — Webview `include` overlaps plugins `include` on `shared/`.**
  Webview tsconfig (`tsconfig.webview.json:30`) includes `src/plugins/**/shared/**/*` and plugins tsconfig (`tsconfig.plugins.json:19`) does not exclude shared. The same files are typechecked under DOM lib and Node lib. Webview is `noEmit`, so no double-emit, but conflicting `lib` settings could mask bugs.

- **LOW — `getCustomProperties` allowlist is out of date with the README.**
  README lists `provide`, `constraints`, `exports`, `server_exports` etc. as "dedicated emit logic," but `getCustomProperties` (BuildManager.ts:1302) excludes them from custom — fine. However, it includes `config` in `standardProps` even though no special handling exists in `generateFxManifest` for it; `config` is silently dropped instead of emitted as a custom property. **Fix:** remove `config` from `standardProps` or handle it.

- **LOW — `BasicPluginManifest` has no `[key: string]: any`, but `loadPluginManifest` returns it cast to `PluginManifest`.**
  `FileManager.ts:163-164` returns `{ name: pluginName } as BasicPluginManifest` from a function declared `Promise<PluginManifest>`. TypeScript allows this since `PluginManifest` requires only `name`, but the structural mismatch hides the fallback path.

- **NIT — Watcher debounce is hardcoded to 300ms.**
  `build.ts:331`. `.env.example` documents `DEBOUNCE_TIME`, `RESOURCE_DEBOUNCE_TIME`, `WEBVIEW_DEBOUNCE_TIME` — none of them are read anywhere. See §6.

- **NIT — `print help` references `ts-node build.ts` but the project uses `tsx`.**
  `build.ts:551`. Cosmetic.

---

## 3. Webview infra — `src/webview/**`

| File | Purpose |
|---|---|
| `App.tsx` | **Transient.** Overwritten and (usually) restored on every webview build. Currently contains a leaked auto-generated stub for `character-create` (see §2). |
| `main.tsx` | Vite entry. `createRoot(...).render(<StrictMode><App/></StrictMode>)`, sets up devtools/`simulateNuiEvent` if `isEnvBrowser()`, imports `theme/index.css` and `i18n`. |
| `i18n.ts` | i18next bootstrap. Hardcoded en/es resource bundles (~70 keys). Does **not** load plugin `translations/*.json`. `useSuspense: false`. |
| `vite-env.d.ts` | Vite ambient types (default). |
| `theme/index.css` | Tailwind base/components/utilities + scrollbar styles. |
| `theme/colors.ts` | Static color palettes (Tailwind defaults transcribed). |
| `theme/tailwind.config.ts` | Tailwind config. Generates fontSizes, glass utilities, accessible text utilities, themed scrollbar styles, safelist. Pulls `brandPalette`/`grayPalette` from `config/palettes`. |
| `theme/config/appConfig.ts` | Single source of truth for active brand/gray palette (`indigo`/`zinc`). |
| `theme/config/palettes.ts` | Resolves `appConfig` selections into concrete palettes. |
| `theme/utils/accessibleTextUtils.ts` | Generates contrast-aware text utilities for Tailwind. |
| `theme/utils/fontSizeUtils.ts` | Generates fluid font-size scale. |
| `theme/utils/glassUtils.ts` | Generates "glass" backdrop-blur Tailwind classes. |
| `theme/utils/safelistUtils.ts` | Computes Tailwind safelist (dynamic class names). |
| `theme/utils/scrollbarThemeUtils.ts` | Generates themed scrollbar classes. |
| `utils/colorUtils.ts` | `hexToRgb`, `getContrastRatio` helpers. |
| `utils/devtools.ts` | Browser-only dev toolbar (`setupDevTools`) + `simulateNuiEvent` MessageEvent dispatcher. |
| `utils/fetchNui.ts` | NUI fetch wrapper with browser mock-response fallback. |
| `utils/file.ts` | `getImageUrl(path)` / `getFontUrl(path)` resolving `../assets/${path}.{png,ttf}` via `import.meta.url`. |
| `utils/misc.ts` | `isEnvBrowser()` (no `window.invokeNative`), `noop()`. |
| `utils/scrollbarUtils.ts` | Programmatic scrollbar helpers. |
| `hooks/useDisplayUI.ts` | Visibility state hook; auto-shows in browser, listens for NUI `ui`/`closeUI` actions. |
| `hooks/useMenuSystem.ts` | `useContext(MenuContext)` wrapper. |
| `hooks/useNuiEvent.ts` | Singleton-backed NUI MessageEvent listener; one global `window.message` listener routes by `action`. |
| `context/MenuContext.tsx` | Reducer + types for left/right/central/toast menus. |
| `context/MenuProvider.tsx` | `MenuProvider` exposing `showMenu/closeMenu/showToast/hideToast`; manages toast timeout. |
| `components/menus/MenuSystem.tsx` | Renders the four menu slots with React portals. |
| `components/ui/Button.tsx` | Themed `<button>` with size/disabled/fullWidth props. |
| `components/ui/Container.tsx` | Glass/padded container shell. |
| `components/ui/IconWrapper.tsx` | Wrapper around react-icons `IconType`. |
| `components/ui/Layout.tsx` | Top-level page layout shell. |
| `components/ui/Spinner.tsx` | Loading spinner. |
| `components/ui/TabButton.tsx` | Tab navigation button. |
| `components/ui/TabLayout.tsx` | Tab layout container. |
| `components/forms/ColorPicker.tsx` | Color input bound to `colorPalettes`/`grayPalettes`. |
| `components/forms/DatePicker.tsx` | Date input wrapper. |
| `components/forms/FormInput.tsx` | Text/number input. |
| `components/forms/FormSelect.tsx` | Select wrapper. |
| `components/forms/FormTextarea.tsx` | Textarea wrapper. |
| `components/forms/Slider.tsx` | Range slider. |
| `pages/ComponentsExamples.tsx` | Demo page using all of the above. Not wired into any plugin. |

### Webview findings

- **HIGH — `src/webview/App.tsx` is checked into git as auto-generated stub.**
  `App.tsx:1-10` is a build artifact that escaped the try/finally restore (see §2). It pins a hardcoded import to `character-create/html/Page.tsx`. This makes the standalone `vite build` (and `pnpm dev` for the webview alone) build the wrong page. **Fix:** add `src/webview/App.tsx` to `.gitignore` and write a clean default at boot.

- **MEDIUM — `i18n.ts` has hardcoded en/es bundles unrelated to plugin translations.**
  `src/webview/i18n.ts:5-140`. Plugins ship `translations/{en,ro}.json` but nothing loads them. Each plugin webview ends up with the framework's en/es keys plus whatever it imports manually. **Fix:** lazy-load plugin `translations/*.json` keyed by `plugin.json` `name`.

- **MEDIUM — `pages/ComponentsExamples.tsx` is dead code.**
  Not referenced by any `Page.tsx` in `src/plugins/**`. Demo page that ships in the bundle only because Vite is told to start from `src/index.html` → `main.tsx` → `App.tsx`. **Fix:** move under `examples/` or behind a route flag.

- **LOW — `useNuiEvent` registers `window.addEventListener('message', ...)` once per browser context with no teardown.**
  `useNuiEvent.ts:39-44`. `initialize()` sets `initialized = true` permanently; if a webview is unmounted/remounted (e.g., HMR or NUI iframe reload) the listener leaks. Practical risk low because each Vite-built webview is isolated to its own iframe.

- **LOW — `vite.config.ts` `define`s `process.env.ASSET_SERVER_URL = 'https://localhost:3000'` but code defaults to `http://localhost:3000`.**
  `vite.config.ts:13,20`; `getClothingImage.ts:40` etc. Comment says "Corrected protocol to http". The Vite `define` will inject https at build, overriding the `||` fallback only when env is genuinely missing. Inconsistency between the two strings.

- **LOW — `theme/utils/scrollbarUtils.ts` (`utils/scrollbarUtils.ts`) — likely overlaps `theme/utils/scrollbarThemeUtils.ts`.** Two scrollbar utility files in different folders. `[UNVERIFIED]` whether one is dead — would need to read both fully.

---

## 4. Dependency surface

### Root `package.json`

`dependencies`:
- UI/runtime: `react@^19.1.0`, `react-dom@^19.1.0`, `react-i18next@^15.4.1`, `react-icons@^5.5.0`, `i18next@^25.0.1`
- Build/tooling-as-deps: `chalk@^5.4.1`, `chokidar@^4.0.3`, `dotenv@^16.5.0`, `esbuild-wasm@^0.25.2`, `fs-extra@^11.3.0`, `glob@^11.0.1`, `glob-promise@^6.0.7`, `lodash@^4.17.21`, `lodash.debounce@^4.0.8`, `rimraf@^5.0.5`
- Image processing: `canvas@^2.11.2`, `image-js@^0.35.5`
- Tailwind: `@tailwindcss/forms@^0.5.10`, `autoprefixer@^10.4.21`, `postcss@^8.5.3`
- Misc: `@types/fs-extra@^11.0.4` (types in deps, not devDeps)

`devDependencies`:
- `@citizenfx/client@2.0.14482-1`, `@citizenfx/server@2.0.14482-1` (exact-pinned)
- `@types/glob@^8.1.0`, `@types/lodash.debounce@^4.0.9`, `@types/node@^22.14.1`, `@types/react@^19.1.2`, `@types/react-dom@^19.1.2`
- `@vitejs/plugin-react@^4.4.1`, `vite@^6.3.2`, `tsx@^4.19.3`, `typescript@^5.8.3`
- `esbuild@^0.25.2`
- **`autoprefixer@^10.4.21`, `postcss@^8.5.3`** — duplicated in `dependencies`
- `tailwindcss@^3.4.17`

### `asset-server/package.json` (separate npm install)

- `compression@^1.7.4`, `cors@^2.8.5`, `dotenv@^16.5.0`, `express@^4.18.3`, `sharp@^0.33.3`

### Findings

- **HIGH — `esbuild-wasm` is in deps, but `BuildManager` imports `esbuild` (native).**
  `BuildManager.ts:4`: `import * as esbuild from 'esbuild';`. `esbuild` is in `devDependencies@^0.25.2`. `esbuild-wasm@^0.25.2` is in `dependencies` but never imported. Either the native binary is what's actually used (in which case `esbuild-wasm` is dead weight, ~10MB) or wasm was the intent and the import is wrong. Lockfile confirms both packages are installed. **Fix:** drop `esbuild-wasm` from deps.

- **MEDIUM — Several deps installed but never imported.**
  Verified by grep across `src/`:
  - `fs-extra` (`@types/fs-extra` also in deps): not imported. BuildManager uses `fs/promises` and `fs` directly.
  - `glob-promise`: not imported. Code uses `glob@11`'s native promise API.
  - `image-js`: not imported anywhere in `src/` or `asset-server/`. `[UNVERIFIED]` whether referenced from a generated/copied script outside `src/`.
  - `rimraf`: not imported. BuildManager uses `fs.rm({ recursive: true, force: true })`.
  - `lodash`: not imported. (`lodash.debounce` is also in deps; only `lodash.debounce` would be relevant given `chokidar`'s built-in debounce.)
  **Fix:** prune.

- **MEDIUM — `autoprefixer` and `postcss` listed in BOTH `dependencies` and `devDependencies` at the same version range.**
  Confusing; pnpm picks one. **Fix:** keep them only in `devDependencies` (they're build-time tools).

- **MEDIUM — `@citizenfx/client` and `@citizenfx/server` in devDeps are exact-pinned to `2.0.14482-1`, but `Dockerfile` and `.env.example` disagree on the corresponding FXServer artifact.**
  `Dockerfile:12` defaults `BINARIES_ARCHIVE_URL` to build `14482-1eed77dd...`. `.env.example:28` provides URL for build `13890-ad6c90072e62...`. The dev's typescript types are pinned to 14482 while their reference `.env` points at a server that's older by ~600 builds. Crashes at runtime if game-build-specific natives diverged. **Fix:** unify the two URLs and bump the env example or the Docker default.

- **LOW — `dotenv` duplicated across root + asset-server** — that's expected (two installs), but worth noting.

- **LOW — `pnpm-workspace.yaml` lists `src/plugins/**` as workspaces.**
  Plugins have no `package.json`, so pnpm finds zero workspace packages — declaration is currently inert. asset-server is intentionally not listed (commented out). The workspace setup is half-wired.

- **LOW — `@types/fs-extra` is in `dependencies` not `devDependencies`.**
  Pure-dev type package. Goes into the runtime bundle dependency tree unnecessarily.

- **NIT — `lodash.debounce` is in deps but the watcher uses a manual `setTimeout` debouncer (build.ts:331).**

---

## 5. Version pinning

| Style | Where | Notes |
|---|---|---|
| Exact (no caret) | `@citizenfx/client@2.0.14482-1`, `@citizenfx/server@2.0.14482-1` | Only two pins. |
| Caret `^` | Everything else in root + asset-server | Standard. |
| Tilde `~` | None | — |
| Star `*` | None | — |
| `packageManager` | `pnpm@10.8.0` (root) | Asset-server has none. |

### Findings

- **MEDIUM — Only `@citizenfx/*` are exact-pinned.** Build tools that determine output behavior (`esbuild`, `vite`, `typescript`, `tsx`, `tailwindcss`) are all `^`. A minor bump can change emitted output silently. **Fix:** consider exact-pinning at least esbuild and vite, since the build pipeline asserts specific behaviors (IIFE format, `--outDir` semantics).

- **LOW — `pnpm-lock.yaml` has installed versions ahead of declared specifiers** (e.g., `glob@11.0.2` for `^11.0.1`, `image-js@0.35.6` for `^0.35.5`). Expected with `^`, just confirming.

- **LOW — `asset-server/` has no `packageManager` pin and uses npm at install time.** Two package managers in one repo. Documented in CLAUDE.md, but worth flagging for reproducibility.

---

## 6. Env vars: code vs. `.env.example` vs. `README.md`

### Referenced in code (`grep process.env`)

| Var | File:line | Default in code |
|---|---|---|
| `SERVER_NAME` | `src/scripts/build.ts:66`, `scripts/start-windows.js:15` | none — interpolated as `undefined` if missing |
| `RELOADER_API_KEY` | `src/scripts/managers/PluginReloadManager.ts:69`, `src/plugins/[default]/core/server/index.ts:9` | `''` (PluginReloadManager) or `'***SCRUBBED***'` (in-game server) |
| `ASSET_SERVER_URL` | `src/plugins/[character]/[auth]/character-create/html/utils/getClothingImage.ts` ×4 | `'http://localhost:3000'` |
| `PORT` | `asset-server/server.js:16` | `3000` |
| `DEFAULT_QUALITY` | `asset-server/server.js:18` | `'medium'` |
| `CACHE_MAX_AGE` | `asset-server/server.js:19` | `86400` |

Plus indirect (Vite `define`): `ASSET_SERVER_URL` set to `'https://localhost:3000'` at build time in `vite.config.ts`.

Plus Docker-only (interpolated by docker-compose, never read by code): `BINARIES_ARCHIVE_URL`, `MYSQL_ROOT_PASSWORD`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`.

### Documented in `.env.example`

`SERVER_NAME`, `RELOADER_API_KEY`, `RELOADER_HOST`, `RELOADER_PORT`, `RELOADER_USE_HTTPS`, `DEBOUNCE_TIME`, `RESOURCE_DEBOUNCE_TIME`, `WEBVIEW_DEBOUNCE_TIME`, `MYSQL_ROOT_PASSWORD`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`, `BINARIES_ARCHIVE_URL`.

### Documented in `README.md`

`SERVER_NAME`, `RELOADER_API_KEY`, `BINARIES_ARCHIVE_URL`, `MYSQL_ROOT_PASSWORD`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`.

### Findings

- **CRITICAL — `RELOADER_API_KEY` defaults to the literal placeholder `'***SCRUBBED***'` in the in-game resource-manager server.**
  `src/plugins/[default]/core/server/index.ts:9`: `const API_KEY = process.env.RELOADER_API_KEY || '***SCRUBBED***';`. Combined with `docker-compose.yml:12` exposing port `3414:3414` to the host (and to whatever the host exposes externally), if the operator runs the stack without setting `RELOADER_API_KEY`, the resource-manager endpoint accepts the example's literal string from `.env.example`. That endpoint can `restartresource <name>` and `restartallresources` — i.e., remote control of which FiveM resources are running. **Fix:** refuse to start the server if `RELOADER_API_KEY` is unset or equal to the placeholder; constant-time compare.

- **HIGH — Five env vars documented in `.env.example` are never read by any code.**
  `RELOADER_HOST`, `RELOADER_PORT`, `RELOADER_USE_HTTPS`, `DEBOUNCE_TIME`, `RESOURCE_DEBOUNCE_TIME`, `WEBVIEW_DEBOUNCE_TIME`. `PluginReloadManager` accepts them as constructor `options` (`PluginReloadManager.ts:68-78`) but `BuildManager.initializeReloadManager()` is called with no options (`BuildManager.ts:96`, no plumbing in `build.ts`). The watcher's debounce is hardcoded to 300ms (`build.ts:331`). **Fix:** plumb the env vars through, or remove from `.env.example`.

- **HIGH — `SERVER_NAME` has no validation.**
  `build.ts:66` interpolates `process.env.SERVER_NAME` directly into the dist path. If unset, output goes to `txData/undefined/resources/[GENERATED]/...`. `start-windows.js:17-27` does check, but the build does not. **Fix:** fail fast in `build.ts` if `SERVER_NAME` is empty.

- **MEDIUM — `ASSET_SERVER_URL` is in code (`getClothingImage.ts`) but undocumented in `.env.example` or README.**
  Configured via Vite `define` (`vite.config.ts:13,20`). Two sources of truth (`define` + runtime `process.env` fallback) for the same key. **Fix:** pick one and document.

- **MEDIUM — `PORT`, `DEFAULT_QUALITY`, `CACHE_MAX_AGE` (asset-server) are undocumented at the repo root.**
  `asset-server/README.md` may cover them `[UNVERIFIED]`, but they don't appear in `.env.example` or root README's env table.

- **LOW — `MYSQL_*` are documented but only used by `docker-compose.yml`.**
  Code never reads MySQL — there's no DB driver in deps. Either the DB is intended for in-game resources to use directly, or this is aspirational. Worth flagging.

---

## Top 5 risks

1. **CRITICAL — Reload endpoint accepts the literal placeholder API key by default.** `src/plugins/[default]/core/server/index.ts:9` + `docker-compose.yml:12` expose port 3414 with `'***SCRUBBED***'` as fallback. Anyone reaching the host can stop/start arbitrary FiveM resources.
2. **HIGH — `src/webview/App.tsx` is a checked-in build artifact.** The auto-generated stub leaked past the try/finally restore in `BuildManager.buildPluginPageTsx`. Standalone Vite runs build the wrong page; `git status` will show spurious diffs after every webview build.
3. **HIGH — Docker default FXServer build (`14482`) and `.env.example` URL (`13890`) point at different artifacts**, and the typescript natives package (`@citizenfx/server@2.0.14482-1`) is pinned to the Docker version. Operators who copy `.env.example` end up with mismatched runtime + types.
4. **HIGH — `ManifestManager` and `PluginManager` are unreachable code (~500 lines).** Manifest parsing and validation logic is duplicated and silently drifts from what `FileManager` actually does at runtime.
5. **HIGH — Auto-reload file-watcher in the in-game core server polls `dist/`, a path the build never writes to.** Half of the hot-reload mechanism is dead; the rest depends on the HTTP endpoint with the placeholder-key issue from #1.

---

## Open questions for later prompts

- **P1 (Security):** does the FiveM Docker container actually expose 3414 to the public internet, or does it bind to a private network? Need to check deployment posture, not just `docker-compose.yml`.
- **P1 (Security):** is the asset-server's wildcard route (`/assets/:quality/*`, `asset-server/server.js:73`) vulnerable to path traversal via `..` segments in `req.params[0]`? Express decodes URLs but the `path.join` could resolve outside `publicDir`. Needs a runtime test.
- **P2 (Build correctness):** what happens with two concurrent `pnpm dev` sessions that touch different plugins simultaneously? `App.tsx` swap is not process-locked. `[UNVERIFIED]` — would need to provoke.
- **P2 (Build correctness):** do existing plugins' `Page.tsx` files actually compile through `tsx` esbuild at `target: es2017` given React 19 JSX runtime requirements? `tsconfig.webview.json` says ES2017 but React 19 requires `react-jsx` automatic runtime; `[UNVERIFIED]` — would need a runtime test build.
- **P3 (Correctness of the plugin discovery):** does `escapeGlobPattern` (FileManager.ts:57-77) correctly handle bracket-in-bracket nesting like `[character]/[auth]/`? It works for the current four plugins but the algorithm is bracket-by-bracket char rewrite — `[UNVERIFIED]` for triple-nested or escaped-bracket folder names.
- **P3 (Dead webview code):** is `pages/ComponentsExamples.tsx` actually dead, or is it referenced via dynamic import / symlinked into a plugin's html dir? Static grep found no users; would need a wider search.
- **P4 (Asset-server intent):** does anything in this repo actually serve image assets from `asset-server/public/`? `getClothingImage.ts` builds URLs to it, but there's no evidence of a populated public directory. Is this fully wired in production?
- **P5 (Hot reload contract):** the in-game `core` resource and the `PluginReloadManager` agree on `Bearer <key>` auth and `/restart`/`/resources` endpoints, but neither side has tests. Does the protocol actually round-trip?
- **P6 (Cleanup ordering):** if `BuildManager.clean()` is run while `pnpm start:docker` is up, FXServer is mid-load against `[GENERATED]/`. Does the rm-and-recreate step race with the FiveM container's resource scan? `[UNVERIFIED]`.
