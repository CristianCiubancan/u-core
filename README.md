# U-Core: FiveM Plugin Framework

U-Core is a TypeScript build framework for FiveM server resources. You author each resource as a "plugin" — a folder with a `plugin.json` and any combination of `client/`, `server/`, `shared/`, and `html/` (React) code — and the build pipeline emits a fully-formed FiveM resource (with auto-generated `fxmanifest.lua`) directly into your server's resource tree, with optional hot-reload while you develop.

![FiveM](https://img.shields.io/badge/FiveM-Compatible-brightgreen)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)
![React](https://img.shields.io/badge/React-19.0+-61DAFB)

## Features

- **Plugin-based architecture** — each plugin is a self-contained resource folder.
- **First-class TypeScript** — separate tsconfig projects for build scripts, plugin client/server code, and the React webview.
- **React UI bundling** — drop a `Page.tsx` in a plugin's `html/` directory and the build system bundles it into a FiveM-compatible NUI page.
- **Watch + hot reload** — `pnpm dev` rebuilds the affected plugin and tells the running FiveM server to `ensure` it again over a local HTTP endpoint.
- **`fxmanifest.lua` generation** — `plugin.json` is the source of truth; the Lua manifest is generated.
- **Docker or native** — run FiveM via `docker-compose` (Linux container + MariaDB) or directly on Windows against a local `FXServer.exe`.

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or newer
- [pnpm](https://pnpm.io/) v10.8.0 (the `packageManager` field pins this)
- A FiveM server, either:
  - [Docker](https://www.docker.com/) + [Docker Compose](https://docs.docker.com/compose/), **or**
  - A local FXServer extracted to `fivem-binaries/FXServer.exe` (Windows only)

## Installation

```bash
pnpm install
cp .env.example .env       # then edit .env with your settings
```

### Required environment variables

| Variable | Used by | Purpose |
| --- | --- | --- |
| `SERVER_NAME` | build, `start:windows` | Selects which `txData/<SERVER_NAME>/` profile to build into and run. |
| `RELOADER_API_KEY` | `pnpm dev` watcher | Auth for the in-game reload endpoint. |
| `BINARIES_ARCHIVE_URL` | Docker build | URL to the FXServer Linux artifact tarball. |
| `MYSQL_ROOT_PASSWORD`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD` | `docker-compose` | MariaDB container config. |

## Commands

| Command | What it does |
| --- | --- |
| `pnpm build` | Build all plugins once. |
| `pnpm dev` | Build all plugins, then watch `src/plugins/**` and rebuild + reload on change. |
| `pnpm start:docker` | `docker-compose down && up -d --build` — FiveM + MariaDB. |
| `pnpm start:windows` | Launch local `fivem-binaries/FXServer.exe` against `txData/${SERVER_NAME}/server.cfg`. |
| `pnpm start:assets` | Start the separate asset optimization/serving server (see `asset-server/README.md`). |

The build CLI (`src/scripts/build.ts`) also accepts flags directly:

```bash
npx tsx src/scripts/build.ts --watch --log-level=verbose --no-clean
```

`--watch`, `--no-clean`, `--stop-on-error`, `--log-level={verbose,info,warn,error}`, `--plugins-dir=<dir>`, `--dist-dir=<dir>`.

## Build output

Plugins are emitted to:

```
txData/${SERVER_NAME}/resources/[GENERATED]/<bracket-path>/<plugin-name>/
```

so FXServer picks them up directly — there is no separate copy step. To run a generated plugin, add `ensure <plugin-name>` to your `server.cfg` once.

The watcher (`pnpm dev`) re-bundles only the changed plugin and posts to `http://localhost:3414` (authed by `RELOADER_API_KEY`) to trigger an in-game reload. The companion FiveM resource that exposes that endpoint is the bundled `[default]/core` plugin — your `server.cfg` must contain `ensure core` for hot-reload to work. See [`txData/server.cfg.example`](./txData/server.cfg.example) for a starter config. If the connection fails at startup the watcher still rebuilds, it just won't auto-reload.

For first-time setup (clone → build → run), see [`CONTRIBUTING.md`](./CONTRIBUTING.md).

## Project layout

```
u-core/
├── src/
│   ├── scripts/              # Build tooling (run via tsx)
│   │   ├── build.ts          # Entry point — parses flags, drives BuildManager
│   │   ├── managers/         # FileManager, BuildManager, PluginReloadManager, …
│   │   └── types/
│   ├── plugins/              # Your resources live here
│   │   ├── [default]/
│   │   │   └── core/
│   │   └── [character]/
│   │       ├── character-edit/
│   │       └── [auth]/
│   │           ├── character-create/
│   │           └── character-select/
│   ├── webview/              # Shared React/Vite infra used by every plugin's html/Page.tsx
│   ├── utils/
│   └── index.html            # Vite entry (Vite root is src/)
├── asset-server/             # Separate sub-package (uses npm) — image optimizer + server
├── scripts/
│   └── start-windows.js      # Launcher for native FXServer.exe
├── txData/                   # Server data; build output lands under [GENERATED]/
├── docker-compose.yml
├── Dockerfile                # FiveM binaries container (Ubuntu 20.04)
└── tsconfig.{plugins,scripts,webview}.json
```

### Bracket folders

Folder names wrapped in brackets — `[default]`, `[character]`, `[auth]`, etc. — are FiveM's [resource grouping convention](https://docs.fivem.net/docs/scripting-manual/runtimes/lua/#resource-folders). They are not plugins themselves; the build preserves the full bracket path in the output. Use them to group related resources.

## Plugin structure

```
plugin-name/
├── client/                # Bundled with platform=browser, IIFE, target ES2017
├── server/                # Bundled with platform=node, Node built-ins externalized
├── shared/                # Available to either side
├── html/
│   └── Page.tsx           # Optional React entry — built into html/index.html via Vite
├── translations/          # i18next JSON (loaded by react-i18next)
└── plugin.json            # Manifest — fxmanifest.lua is generated from this
```

**Server vs. client detection is path-based.** A `.ts`/`.js` file is bundled as server code if and only if its absolute path contains `/server/` (or `\server\`). Files in `client/` and `shared/` are bundled for the browser. There is no override — if you put server-only code outside a `server/` folder, it will silently be bundled with the wrong platform.

### `plugin.json`

This is the source of truth. The build generates `fxmanifest.lua` from it; do not hand-author the Lua file.

```json
{
  "name": "character-edit",
  "version": "0.1.0",
  "fx_version": "cerulean",
  "author": "Your Name",
  "description": "Character editor UI",
  "games": ["gta5", "rdr3"],
  "client_scripts": ["client/*.js"],
  "server_scripts": ["server/*.js"],
  "files": ["html/**/*", "translations/*.json"],
  "ui_page": "html/index.html"
}
```

Standard manifest fields (`fx_version`, `games`, `author`, `description`, `version`, `client_scripts`, `server_scripts`, `shared_scripts`, `ui_page`, `files`, `data_files`, `dependencies`, `provide`, `constraints`, `exports`, `server_exports`, `is_map`, `server_only`, `loadscreen`) get dedicated emit logic; anything else is emitted verbatim as `key 'value'`.

## Webview UI

Each plugin can have its own React UI by creating `html/Page.tsx`. The build:

1. Generates a temporary `src/webview/App.tsx` that re-exports `Page` from your plugin.
2. Runs `npx vite build --outDir=<plugin-dist>/html`.
3. Restores the original `App.tsx`.

Because the swap is global, plugin webview builds run sequentially. Don't rely on `src/webview/App.tsx` having stable contents — it's overwritten and restored on every webview build.

```tsx
// src/plugins/[character]/character-edit/html/Page.tsx
import React from 'react';

export default function Page() {
  return (
    <div className="container">
      <h1>Character Edit</h1>
    </div>
  );
}
```

The shared `src/webview/` folder provides Tailwind config, theme, i18n setup, dev tools, and the entry HTML used by Vite — your `Page.tsx` plugs into that infra.

## Docker deployment

```bash
docker-compose up -d --build
```

This brings up a FiveM container that downloads FXServer from `BINARIES_ARCHIVE_URL` at image build time and a MariaDB 10.5 sidecar. `txData/` is bind-mounted into the FiveM container at `/root/binaries/txData`, so `pnpm build` on the host writes directly into the running server's resource tree.

Exposed ports: `30120/tcp+udp` (FiveM), `40120/tcp` (txAdmin), `3414/tcp` (reload endpoint), `3306/tcp` (MariaDB).

## Asset server

`asset-server/` is a separate sub-package (uses `npm`, has its own `package.json`) that optimizes images at multiple quality levels and serves them with caching/compression. See `asset-server/README.md` for its commands and URL scheme. It runs independently of the FiveM build pipeline.

## TypeScript projects

`tsconfig.json` is a solution file referencing three projects:

- `tsconfig.scripts.json` — Node tooling under `src/scripts/**` (NodeNext modules).
- `tsconfig.plugins.json` — plugin client/server/shared code (ES2022, **excludes `**/html/**`**).
- `tsconfig.webview.json` — `src/webview/**` plus every plugin's `html/**` and `shared/**` (DOM lib, `react-jsx`, `noEmit`).

Files placed in the wrong tree won't typecheck. In particular, DOM-only code belongs in `html/` (webview project), not in `client/` (plugins project).

## Contributing

Issues and pull requests welcome.

## License

ISC — see the LICENSE file.
