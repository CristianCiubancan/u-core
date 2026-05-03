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

1. **Page.tsx → webview bundle** (`buildPluginPageTsx`). If the plugin has `html/Page.tsx`, the builder **overwrites `src/webview/App.tsx`** with a stub that re-exports that page, runs `npx vite build --outDir=<plugin-dist>/html`, then **restores the original App.tsx**. Consequence: `src/webview/App.tsx` is transient build state — never edit it, and never commit it as a meaningful file. Concurrent webview builds would clobber each other; the builder runs plugins sequentially for this reason.
2. **TS / JS bundling** (esbuild, IIFE, `target: es2017`, inline sourcemaps). Server vs. client is detected purely by path: `/server/` → `platform: 'node'` + Node built-ins externalized + `canvas` external. Anything else → `platform: 'browser'`. There is no other config — putting server code outside a `server/` folder will silently bundle it for the browser.
3. **fxmanifest.lua generation** (`buildPluginManifest`). `plugin.json` is the **source of truth**; `fxmanifest.lua` is generated and written into the dist directory only. Do not hand-author `fxmanifest.lua`. Properties beyond the standard set (`name`, `client_scripts`, `ui_page`, `constraints`, etc. — see `getCustomProperties`) are emitted as `key 'value'` pairs.
4. **Other files** — Lua, JSON (excluding `plugin.json`), translations, html assets are copied verbatim.

Output goes to **`txData/${SERVER_NAME}/resources/[GENERATED]/<parent-path>/<plugin-name>/`**, not `dist/`. The `dist/` references in the README are stale — `BuildManager`'s default is overridden in `build.ts` to the txData path so FXServer picks it up directly.

## Plugin layout and discovery

`FileManager` walks `src/plugins/**` looking for `plugin.json`. Folders wrapped in brackets (`[default]`, `[character]`, `[auth]`, `[misc]`) are FiveM's resource-grouping convention — they are **not** plugins themselves but their full bracket path is preserved in the output. Example: `src/plugins/[character]/[auth]/character-create/` builds to `[GENERATED]/[character]/[auth]/character-create/`.

A plugin folder typically contains:
- `client/`, `server/`, `shared/` — script roots (path-based platform detection, see above).
- `html/Page.tsx` — optional React UI entry; consumes shared webview infra in `src/webview/`.
- `translations/*.json` — i18next resources.
- `plugin.json` — manifest.

## TypeScript project layout

`tsconfig.json` is a solution file with three referenced projects. Keep new files in the right one or they won't typecheck:
- `tsconfig.scripts.json` — Node tooling (`src/scripts/**`), NodeNext modules, emits to `dist/scripts`.
- `tsconfig.plugins.json` — plugin client/server/shared code, ES2022, **excludes `**/html/**`**.
- `tsconfig.webview.json` — webview + plugin `html/**` + plugin `shared/**`, JSX `react-jsx`, `noEmit` (Vite/esbuild handle emission).

The `html/` directories live in the webview project (DOM lib, JSX) — the plugins project explicitly excludes them. Don't import DOM-only code from `client/` or `server/`.

## Hot reload protocol

`pnpm dev` requires a companion FiveM resource that listens on `http://localhost:3414` and accepts the `RELOADER_API_KEY`. `PluginReloadManager.initialize` pings `GET /resources` to verify connectivity; rebuilds POST to that endpoint to trigger `ensure <resource>` in-game. If the connection fails at startup the watcher still rebuilds — it just won't reload. Treat reload failures as non-fatal.

## Vite config quirks

`vite.config.ts` sets `root: 'src/'` and `outDir: '../dist/webview'`. The build output **after** the BuildManager pipeline is moved/renamed: each per-plugin `vite build --outDir=<plugin-dist>/html` writes directly into the plugin's dist folder. The `dist/webview` path is effectively unused in production builds.
