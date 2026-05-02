# Contributing to u-core

This file covers the local-development workflow. The architectural overview
lives in [README.md](./README.md) and [CLAUDE.md](./CLAUDE.md).

## First run

```bash
pnpm install
cp .env.example .env       # edit .env: set SERVER_NAME, RELOADER_API_KEY,
                           # MYSQL_*, BINARIES_ARCHIVE_URL
pnpm build                 # one-shot build of every plugin
```

`pnpm build` writes resources into
`txData/${SERVER_NAME}/resources/[GENERATED]/`. Make sure your `server.cfg`
has an `ensure <name>` line for each plugin you want loaded — see
[`txData/server.cfg.example`](./txData/server.cfg.example) for a starter.

## Hot reload

```bash
pnpm dev   # build once, then watch src/plugins/** and rebuild on change
```

The watcher posts to `http://localhost:3414` after each rebuild to ask the
running FXServer to `ensure` the affected resource. **This requires the
`core` resource to be running in your FXServer instance** — i.e. your
`server.cfg` must contain `ensure core` (and the `core` plugin must be
present at `[GENERATED]/[default]/core/`, which `pnpm build` produces).

If the connection to the in-game endpoint fails on startup, the watcher
still rebuilds — it just can't trigger an in-game reload. You'll see a
warning at startup; treat it as informational.

## Two package managers

The project uses **pnpm** at the repo root and **npm** inside
`asset-server/`. They are independent: `asset-server/` has its own
`package.json` and `node_modules`. `pnpm start:assets` shells into
`asset-server/` and runs `npm install && npm start` for you. If you edit
asset-server code, work inside that directory and use `npm` for dep
changes there.

## Code style and lint

Style is owned by Prettier; lint is owned by ESLint (flat config). Editors
should pick up `.editorconfig` automatically.

```bash
pnpm format          # auto-fix formatting
pnpm format:check    # verify formatting (CI-mode)
pnpm lint            # report lint warnings/errors
pnpm lint:fix        # auto-fix what's auto-fixable
```

CI runs `lint` and `format:check`; PRs that fail either get a red check.

## Type checking

```bash
pnpm exec tsc -b
```

`tsconfig.json` is a solution file with three referenced projects:
`tsconfig.scripts.json` (Node tooling), `tsconfig.plugins.json` (plugin
client/server/shared, **excludes `**/html/**`**), and `tsconfig.webview.json`
(webview infra + every plugin's `html/**`, JSX).

Files placed under the wrong tree won't typecheck. In particular: DOM-only
React code belongs in `html/` (webview project), not `client/`.

## Tests

```bash
pnpm test
```

Vitest, single-run mode. Add tests under `tests/` (or colocated `*.test.ts`)
mirroring the source layout.

## Submitting changes

1. Branch from `master`.
2. Keep PRs small and focused. Big basket PRs (multiple unrelated changes)
   slow review and increase rollback risk.
3. Run `pnpm format && pnpm lint && pnpm exec tsc -b && pnpm build &&
   pnpm test` locally before opening the PR.
4. Reference any related risk IDs from `audit/` reports in the PR
   description if applicable.
5. Don't commit `.env`, secrets, or generated files under
   `txData/.../resources/[GENERATED]/`.

## Bumping FXServer

When you change `BINARIES_ARCHIVE_URL`, you **must** also refresh
`fxserver.sha256` in the same commit so the Docker build still verifies the
download:

```bash
URL="https://runtime.fivem.net/artifacts/fivem/build_proot_linux/master/.../fx.tar.xz"
curl -L "$URL" -o /tmp/fx.tar.xz
sha256sum /tmp/fx.tar.xz | awk '{print $1"  fx.tar.xz"}' > fxserver.sha256
```

The Dockerfile's `ARG BINARIES_ARCHIVE_URL` default and `.env.example`'s
`BINARIES_ARCHIVE_URL` should also be kept in sync.
