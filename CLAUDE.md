# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

U-Core is a TypeScript build framework for FiveM server resources. It is **not** a runtime — `pnpm build` consumes `src/plugins/**` and emits FiveM-compatible resources (with auto-generated `fxmanifest.lua`) into the FiveM server's `resources/` tree. The FiveM server itself runs separately (Docker or `pnpm start:windows` via `FXServer.exe`).

## Commands

- `pnpm build` — build all plugins once.
- `pnpm dev` — `build.ts --watch`. Rebuilds the affected plugin on file change (debounced 300ms) and posts to the in-game reload endpoint (port 3414, authed by `RELOADER_API_KEY`) to hot-reload that resource.
- `pnpm start:docker` — bring up FiveM + MariaDB containers (`docker-compose down && up -d --build`).
- `pnpm start:windows` — launch `fivem-binaries/FXServer.exe` against `txData/${SERVER_NAME}/server.cfg` (kills any process on port 30120 first).
- `pnpm start:assets` — runs the **separate** asset-server sub-package (it uses `npm`, not pnpm; it has its own `package.json` and `node_modules`).
- No test runner, linter, or formatter is configured. Don't invent commands for them.

Required env vars (loaded from `.env` via dotenv): `SERVER_NAME`, `RELOADER_API_KEY`, `MYSQL_*`, `BINARIES_ARCHIVE_URL`.

## Server bootstrap (txAdmin recipe)

The Docker image ships only the FXServer binaries. Everything under `txData/${SERVER_NAME}/` (resource trees, `server.cfg`, txAdmin profile) is **wizard-generated** on first run and fully gitignored. Source of truth for what gets deployed lives in `txadmin/`:

- `txadmin/recipe.yaml` — txAdmin recipe URL: `https://raw.githubusercontent.com/CristianCiubancan/u-core/master/txadmin/recipe.yaml`. Fork of [`qbcore-framework/txAdminRecipe`](https://github.com/qbcore-framework/txAdminRecipe). The **only** divergence from upstream is the `move_path` calls for `server.cfg` and `myLogo.png` — they pull from this repo's `txadmin/` subpath instead of upstream's. Resource downloads (qb-core, qb-* job pack, pma-voice, etc.) all still hit the same upstream repos at the same refs, so resource updates flow through automatically.
- `txadmin/server.cfg` — deliberately diverges from upstream in two places:
  - `setr voice_useSendingRangeOnly false` (per pma-voice recommendation; ignore client-sent position info).
  - Explicit `ensure webpack` before `[standalone]`. Without this, screenshot-basic (which declares `dependency 'webpack'`) loses a race against webpack's first-boot yarn-install build task and fails to start. Do not remove this line.

  All `{{placeholder}}` tokens (`{{serverEndpoints}}`, `{{dbConnectionString}}`, `{{svLicense}}`, etc.) are substituted by txAdmin's recipe runner — leave them intact.

**Editing `txData/${SERVER_NAME}/server.cfg` directly is a workaround, not a fix.** It won't propagate to new `SERVER_NAME` deploys and may be overwritten if the recipe is re-run. For durable cfg changes, edit `txadmin/server.cfg` and push — the next wizard run picks it up.

**Recipe maintenance:** periodically diff against upstream and merge structural changes manually:
```bash
diff <(curl -sL https://raw.githubusercontent.com/qbcore-framework/txAdminRecipe/main/qbcore.yaml) txadmin/recipe.yaml
diff <(curl -sL https://raw.githubusercontent.com/qbcore-framework/txAdminRecipe/main/server.cfg) txadmin/server.cfg
```

## Build pipeline (the non-obvious bit)

The build is orchestrated by `src/scripts/build.ts` → `BuildManager` (`src/scripts/managers/BuildManager.ts`). For each discovered plugin it runs, in order:

1. **Page.tsx → webview bundle** (`buildPluginPageTsx`). If the plugin has `html/Page.tsx`, the builder runs Vite's JS API in-process. The page is loaded via the `virtual:plugin-page` module, resolved by `src/scripts/util/vite-plugin-page-entry.ts` from a closure-captured path (NOT `process.env`, because parallel builds would race — see `project_buildmanager_env_race`). There is no `src/webview/App.tsx`; `main.tsx` does `import Page from 'virtual:plugin-page'`. Cross-plugin webview builds run in parallel.
2. **TS / JS bundling** (esbuild, IIFE, `target: es2017`). Files are bundled only if they match a glob in `client_scripts` / `server_scripts` / `shared_scripts` from `plugin.json` — files outside those globs are silently NOT bundled. Platform comes from which list the file is in: server entries → `platform: 'node'` + Node built-ins externalized + `canvas` external. Client and shared → `platform: 'browser'`. Sourcemaps: client never (would leak source over the wire), server external in prod / inline in dev.
3. **fxmanifest.lua generation** (`buildPluginManifest`). `plugin.json` is the **source of truth**; `fxmanifest.lua` is generated and written into the dist directory only. Do not hand-author `fxmanifest.lua`. Properties beyond the standard set (`name`, `client_scripts`, `ui_page`, `constraints`, etc. — see `getCustomProperties`) are emitted as `key 'value'` pairs.
4. **Other files** — Lua, JSON (excluding `plugin.json` and JSON files already inlined into a webview/script bundle — Vite output graph + esbuild metafile drive the exclusion; see `project_buildmanager_import_aware_assets`), html assets are copied verbatim.

Output goes to **`txData/${SERVER_NAME}/resources/[GENERATED]/<parent-path>/<plugin-name>/`**, not `dist/`. The `dist/` references in the README are stale — `BuildManager`'s default is overridden in `build.ts` to the txData path so FXServer picks it up directly.

## Plugin layout and discovery

`FileManager` walks `src/plugins/**` looking for `plugin.json`. Folders wrapped in brackets (`[default]`, `[character]`, `[auth]`, `[misc]`) are FiveM's resource-grouping convention — they are **not** plugins themselves but their full bracket path is preserved in the output. Example: `src/plugins/[character]/[auth]/character-create/` builds to `[GENERATED]/[character]/[auth]/character-create/`.

A plugin folder typically contains:
- `client/`, `server/`, `shared/` — script roots. Convention only; whether a file actually bundles for client or server depends on which manifest glob (`client_scripts` / `server_scripts` / `shared_scripts`) matches it, not its directory.
- `html/Page.tsx` — optional React UI entry; consumes shared webview infra in `src/webview/`.
- `translations/*.json` — i18next resources, imported by Page.tsx and inlined into the webview bundle by Vite (not shipped as raw assets).
- `plugin.json` — manifest.
- Plain `.lua` files — copied to dist verbatim, no transformation. Plugin can mix Lua and TS freely.

## TypeScript project layout

`tsconfig.json` is a solution file with five referenced projects. Keep new files in the right one or they won't typecheck:
- `tsconfig.scripts.json` — Node tooling (`src/scripts/**`), NodeNext modules, emits to `dist/scripts`.
- `tsconfig.plugins.client.json` — plugin client TS, lib `@citizenfx/client` only.
- `tsconfig.plugins.server.json` — plugin server TS, lib `@citizenfx/server` + `node`.
- `tsconfig.plugins.shared.json` — plugin shared TS, no platform-specific lib.
- `tsconfig.webview.json` — webview + plugin `html/**` + plugin `shared/**`, JSX `react-jsx`, `noEmit` (Vite/esbuild handle emission).

The split enforces type segregation: client TS can't accidentally `import` server-only APIs and vice versa. Don't import DOM-only code from `client/` or `server/`.

## Hot reload protocol

`pnpm dev` requires a companion FiveM resource that listens on `http://localhost:3414` and accepts the `RELOADER_API_KEY`. `PluginReloadManager.initialize` pings `GET /resources` to verify connectivity; rebuilds POST to that endpoint to trigger `ensure <resource>` in-game. If the connection fails at startup the watcher still rebuilds — it just won't reload. Treat reload failures as non-fatal.

## Vite config quirks

`vite.config.ts` exists for IDE / standalone-CLI use but `BuildManager` does NOT load it — it calls Vite's JS API directly with `configFile: false` and an explicit `InlineConfig` per build (see `runViteBuild`), so the dep-prebundle cache and Rollup state stay warm across plugins and rebuilds in a single session. Each call writes straight to `<plugin-dist>/html`. Two modes exist: `consumer` (lib + IIFE + externalized React/ReactDOM/i18next, used when the `_shared` vendor plugin is present — see `project_shared_vendor_contract`) and `standalone` (full self-contained bundle for plugins built without the vendor).
