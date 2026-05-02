# P6 — Production Readiness & DX

Audit of the U-Core build framework against the bar: *can a new contributor clone Friday at 5pm and ship Monday morning?* Read-only; only this file is written. Severity tags follow CRITICAL / HIGH / MEDIUM / LOW / NIT. `[UNVERIFIED]` marks claims that need a runtime check.

Repo state: `master @ ffae3e5e` (2026-05-02).

---

## 1. Tests

**Count: 0.** No `*.test.*`/`*.spec.*` outside `node_modules`, no `__tests__` directory, no test runner declared (`grep -E 'vitest|jest|mocha|tap|ava'` against `package.json` and `asset-server/package.json` returns nothing), no `tsconfig.test.json`, no CI to run them. The `coverage/` line in `.gitignore:67` is the only acknowledgement that tests should exist.

### Findings

- **HIGH — Zero automated tests, zero typecheck-in-CI.**
  Both `asset-server/server.js` (path-traversal-prone, see P1) and `BuildManager.ts` (App.tsx swap, manifest emission, esbuild platform routing) ship without a single regression check. Combined with shaping the `dist/` of the running server directly (`txData/${SERVER_NAME}/resources/[GENERATED]`), a bad build silently corrupts the operator's resource tree.
  **Fix:** add `vitest` (already aligned with Vite already in deps) and a `pnpm test` script. Land it together with item #2 (CI) so the first PR after has a guard.

### Highest-value first 5 tests for the build system

Each one targets a known failure mode already documented in inventory/architecture (`audit/00`–`03`). Suggested layout: `tests/` next to `src/`, runner `vitest`, fixtures under `tests/fixtures/plugins/`.

1. **Manifest generation** (`plugin.json` → `fxmanifest.lua`)
   - Fixture `plugin.json` exercising every standard property in `getCustomProperties` (`BuildManager.ts:1302`) plus two custom ones, plus `config` (silently dropped today — see inventory §2).
   - Snapshot the emitted Lua. Catches: dropped fields, quoting bugs, ordering drift between `name`, `version`, `fx_version`, `games`, `client_scripts`, `ui_page`.
   - Bonus: assert `fxmanifest.lua` is **not** also written into `src/plugins/**` (regression for hand-authored manifest leakage).

2. **Server vs. client path-based routing** (`isServerScript`, `BuildManager.ts:911`)
   - Table-driven assertions on a fixture file tree:
     - `plugins/foo/server/x.ts` → `platform: 'node'`
     - `plugins/foo/client/server-utils/x.ts` → `platform: 'browser'` (currently misclassified — substring bug)
     - `plugins/foo/shared/x.ts` → `platform: 'browser'`
   - Catches the `'/server/'` substring footgun. Failing this test is the actionable signal to switch to a path-segment match.

3. **Reload protocol — happy path + auth + retry**
   - Spin up an in-process HTTP stub on a free port, point `PluginReloadManager` at it.
   - Assert `Authorization: Bearer <key>`, `POST /restart?resource=...`, JSON parse of `{success, message}`.
   - Negative cases: 401 → `success: false`, body propagates; connection refused → `success: false`, no throw to caller (matches `reloadResource` swallow at `PluginReloadManager.ts:153-167`).
   - Catches: `Bearer ` prefix typos, URL-encoding regressions of resource names with brackets/spaces, the silent `if (response.success)` flip on falsy values.

4. **Watch debounce / file event handling** (`build.ts:307-336`)
   - Drive `handleFileChange` with synthetic events using fake timers; assert one rebuild is queued after a burst of N changes, that subsequent changes during `isBuilding` are deferred to the next tick (`process.nextTick(processRebuildQueue)` at `build.ts:301`).
   - Catches: lost events when `rebuildQueue.add(plugin.fullPath)` runs while `processRebuildQueue` is mid-flight, and the regression of moving the debounce off 300ms (currently hardcoded — see inventory §6).

5. **App.tsx swap restoration on crash** (`BuildManager.ts:570-608`)
   - Fixture: an existing `App.tsx` with known content; force `runViteBuild` to throw (mock `child.on('close', ...)` returning non-zero); assert `App.tsx` is restored byte-for-byte.
   - Then a second case: `App.tsx` does **not** exist before the build; assert the finally writes a sentinel (NOT the auto-generated stub) — currently broken: empty `originalAppContent` causes the finally to skip restoration entirely, which is exactly the failure mode that left the stub committed today (see inventory §3 HIGH).
   - Catches: future regressions of the lock contract that `pnpm dev` depends on.

---

## 2. CI

**No workflow files.** `.github/`, `.gitlab-ci.yml`, `.circleci/`, `azure-pipelines.yml`, `bitbucket-pipelines.yml` — none present. Verified by Glob across the repo root.

### Findings

- **HIGH — No CI of any kind.**
  Type errors, missing files, broken imports, and dependency drift only surface on a contributor's machine. The three referenced tsconfig projects (`scripts`, `plugins`, `webview`) are never typechecked together except by an IDE.
  **Fix:** minimal GitHub Actions workflow below. Should run on push + PR, ~3 min wall time.

### Proposed `.github/workflows/ci.yml`

```yaml
name: CI
on:
  push:
    branches: [master]
  pull_request:
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 10.8.0 }
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec tsc --build tsconfig.json    # all 3 projects via solution file
      - run: SERVER_NAME=ci-stub pnpm build         # build all plugins
      - run: pnpm exec tsc --noEmit -p asset-server # if asset-server adds tsconfig
```

Notes:

- `SERVER_NAME=ci-stub` is required because `build.ts:66` interpolates it into `distDir` unconditionally — without it, output goes to `txData/undefined/...`. Document this in CONTRIBUTING.
- Once tests land (item #1), add `pnpm test` after the build step.
- `canvas@^2.11.2` builds native deps on Linux runners — pnpm will fetch prebuilt binaries. If that fails the workflow needs `apt-get install libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev`.

---

## 3. Healthchecks

### Findings

- **HIGH — `docker-compose.yml` declares no `healthcheck:` blocks.**
  Files: `docker-compose.yml:1-32`. `fivem` depends on `db` via `depends_on:` only — Compose's bare `depends_on` waits for the container to start, not for MariaDB to accept connections. On cold boot the FiveM container will race the DB and any in-game resource that connects on init can crash.
  **Fix:** add `healthcheck` to `db:` (`mysqladmin ping -uroot -p$MYSQL_ROOT_PASSWORD`) and convert `depends_on:` to long form with `condition: service_healthy`.

- **HIGH — No readiness probe on the `fivem:` service.**
  txAdmin is exposed at `40120/tcp` (`docker-compose.yml:11`) and the reload endpoint at `3414/tcp` (auth-required). A trivial liveness probe is `curl -f http://localhost:40120/` (txAdmin's HTTP UI returns 200 once it has loaded). For an end-to-end readiness probe, hit `GET /resources` against `3414` with a valid Bearer key — that returns `{success: true}` only after the in-game `core` resource has finished `server.listen(PORT, ...)` (`src/plugins/[default]/core/server/index.ts:285`). `[UNVERIFIED]` whether txAdmin returns 200 before FXServer has loaded resources — would need a runtime probe.
  **Fix:** add `healthcheck:` on `fivem:` running `curl -fsS http://localhost:40120 || exit 1` with a generous `start_period: 60s`.

- **MEDIUM — `Dockerfile` runs `apt-get update` without pinning, has no `HEALTHCHECK`.**
  `Dockerfile:1-31`. Image entrypoint is `/root/binaries/run.sh`; no internal `HEALTHCHECK` instruction. Combined with `restart: unless-stopped`, a hung-but-alive FXServer will not be restarted automatically.
  **Fix:** add `HEALTHCHECK CMD curl -f http://localhost:40120/ || exit 1` in the Dockerfile (also requires `curl` to remain installed — currently only present at build time).

---

## 4. Logging in production

### Findings

- **MEDIUM — Logging is `console.log` + chalk only, with no rotation, no levels in production, no structured fields.**
  `src/scripts/build.ts:455-492` (build CLI), `src/plugins/[default]/core/server/index.ts:11`/`:194`/`:285` (in-game resource), `src/scripts/managers/PluginReloadManager.ts:283-322` `[UNVERIFIED line]`. All output is human-prose with `chalk` ANSI codes; nothing emits JSON or key=value pairs. No `winston`, `pino`, `bunyan` in deps. Container stdout flows to Docker's default `json-file` driver — uncapped (`docker-compose.yml` has no `logging:` block), so disk fills until the operator notices.
  **Fix (compose):** add `logging: { driver: json-file, options: { max-size: 10m, max-file: 5 } }` to both services. **Fix (code):** consolidate logging behind a single `Logger` instance per project that can switch to JSON when `NODE_ENV=production` or `LOG_FORMAT=json`. Do not add a logging dep just for this — the chalk wrapping at `build.ts:474-489` is already centralized; replace its body with conditional JSON emission.

- **MEDIUM — Chalk ANSI codes pollute `txData/.../logs/`-bound output.**
  `restartresource` and `restartallresources` are FiveM commands that print via `console.log` (`src/plugins/[default]/core/server/index.ts:439-471`). FXServer captures stdout into its own log files; ANSI codes survive into log files unless the consumer strips them.
  **Fix:** detect `process.stdout.isTTY === false` and disable chalk (`chalk.level = 0`) — chalk does this automatically *only* when run as a Node process with a TTY check; under FXServer the autodetect is unreliable. `[UNVERIFIED]` whether FXServer pipes stdout in a way chalk can detect — would need to read a real container log.

- **LOW — No log buffering controls; chalk writes via `console.log` (line-buffered to stdout).**
  Under Docker, stdout from Node is fully buffered when not a TTY. The compose file sets `tty: true` for `fivem:`, which forces line buffering — fine for FXServer's own output, but `setInterval(() => checkForChanges(), 2000)` in `core/server/index.ts:336` produces no output anyway because the path is wrong (see inventory §2 HIGH). The build CLI is run on the host outside Docker so this is fine for it.

- **LOW — `start-windows.js` prints a y/n prompt to stdin from a non-interactive script.**
  `scripts/start-windows.js:258-267`. `pnpm start:windows` works only if the operator is at a TTY; piped/CI use will hang on `process.stdin.once('data', ...)`. Document or guard with `if (!process.stdin.isTTY) process.exit(2)`.

---

## 5. README accuracy

Walked every command and claim in `README.md` against the actual code. Everything below is a verified discrepancy unless tagged `[UNVERIFIED]`.

### Findings

- **HIGH — `README.md:196` claims "ISC — see the LICENSE file." but no `LICENSE` file exists at the repo root.**
  `package.json:17` also declares `"license": "ISC"`. Distributing an ISC-licensed project without the license text is a packaging bug for downstream consumers.
  **Fix:** add the standard ISC `LICENSE` template, or change the README/package.json to reflect the actual license.

- **HIGH — `README.md:50` `pnpm start:assets` runs `cd asset-server && npm install && npm start`, but this is `pnpm` calling `npm install` from a pnpm-managed repo, in a directory with its own `package-lock.json`.**
  `package.json:11`. Two package managers in a single command. Cold install on a fresh clone will create `asset-server/node_modules/` separately from root `node_modules/`, doubling install time and confusing `pnpm` shrinkwrap audits. CLAUDE.md acknowledges this; README does not.
  **Fix:** document the asymmetry, or migrate `asset-server` to a pnpm workspace package (see item #9).

- **HIGH — `README.md:53-57` example uses `npx tsx src/scripts/build.ts` but `build.ts:551` print-help text says `Usage: ts-node build.ts [options]`.**
  Internal contradiction. Cosmetic but confusing the moment a user runs `pnpm build --help`.
  **Fix:** change `build.ts:551` to `tsx`.

- **MEDIUM — `README.md:39` claims `BINARIES_ARCHIVE_URL` is a "URL to the FXServer Linux artifact tarball" but the README never mentions the build mismatch between `.env.example:28` (build 13890) and `Dockerfile:12` (build 14482-1eed77dd).**
  See inventory §4 HIGH. A copy-paste-`.env`-and-go user gets a TypeScript compiler pinned to one FXServer build (`@citizenfx/server@2.0.14482-1`) and a runtime binary 600 builds older. README needs to either (a) tell the operator to keep them in sync, or (b) the codebase needs to unify.

- **MEDIUM — `README.md:174` "Exposed ports: `30120/tcp+udp` (FiveM), `40120/tcp` (txAdmin), `3414/tcp` (reload endpoint), `3306/tcp` (MariaDB)" is honest about Compose's defaults but does NOT warn that `3306` and `3414` get bound to `0.0.0.0` by default.**
  Combined with the `RELOADER_API_KEY` placeholder default (inventory §6 CRITICAL), an operator copying `.env.example` to `.env` exposes a fully-credentialed remote-control endpoint to the public network.
  **Fix:** README should say "bind these to `127.0.0.1:3414` if your host is internet-facing" with an example `docker-compose.override.yml`. Or change the default in `docker-compose.yml:12` to `127.0.0.1:3414:3414`.

- **MEDIUM — `README.md:57` flag list is missing `--help` / `-h`.**
  Present in `parseArgs` (`build.ts:533-537`) but not in the README's flag list. NIT, but the inverse (flags listed and not implemented) is also worth checking — verified all README flags exist in `parseArgs`.

- **MEDIUM — README does not document the companion reload resource at all.**
  `README.md:70` says "the reload requires a companion FiveM resource that exposes that endpoint" but never says **the companion is `[default]/core` itself, included in this repo**, and that the operator must `ensure core` in `server.cfg` for `pnpm dev` to work. A new contributor would search for an external dep that doesn't exist.
  **Fix:** add a "Hot-reload setup" section: "Add `ensure core` to `server.cfg`. The `core` plugin in this repo provides the reload endpoint."

- **MEDIUM — `README.md:62-68` says "Plugins are emitted to `txData/${SERVER_NAME}/resources/[GENERATED]/...`" but never says `txData/` is gitignored.**
  `.gitignore:31` `txData/`. A user who `pnpm install`s and then runs `pnpm build` against an empty `SERVER_NAME` (no `.env`) gets `txData/undefined/...` — silently. README should call out the requirement that `SERVER_NAME` be set first.

- **LOW — `README.md:21` claims "pnpm v10.8.0".**
  Matches `package.json:18` `"packageManager": "pnpm@10.8.0"`. Good. NIT: any newer pnpm (10.10, 10.20) will refuse to honor scripts under Corepack's strict mode without explicit allow.

- **LOW — `README.md:22-24` "A FiveM server, either: Docker, OR a local FXServer extracted to `fivem-binaries/FXServer.exe`".**
  `fivem-binaries/` is in `.gitignore:85` and the directory does not exist on a fresh clone. README does not say where to obtain `FXServer.exe` or how to extract it. The Dockerfile *does* show the URL pattern (`https://runtime.fivem.net/artifacts/fivem/...`), but a Windows-only operator using `pnpm start:windows` has no breadcrumb to follow.
  **Fix:** either point to https://runtime.fivem.net/artifacts/fivem/build_server_windows/master/ or add a `pnpm setup:fxserver` script that downloads it.

- **LOW — `README.md:172` "`pnpm build` on the host writes directly into the running server's resource tree" — true, but a corollary is missing: this means a build mid-FXServer-load corrupts in-flight resource scans.**
  Inventory's open question P6 calls this out; README does not.

- **LOW — `README.md:139` lists "`provide`, `constraints`, `exports`, `server_exports`, `is_map`, `server_only`, `loadscreen`" as "dedicated emit logic" but the inventory found `config` is in `standardProps` without dedicated emit (silently dropped). README and code disagree.

---

## 6. Onboarding gotchas

Every undocumented step a new contributor will trip on, in roughly the order they hit them. Cross-reference: README walked above only documents items 1–3 partially.

1. **`.env` setup**
   - Must `cp .env.example .env`. `RELOADER_API_KEY` must be changed (see inventory §6 CRITICAL — leaving the placeholder exposes the in-game resource-manager endpoint). README does not say to change it.
   - `SERVER_NAME` must be set or `pnpm build` writes to `txData/undefined/...`. README does not say "this is required for build, not just for runtime."
   - `BINARIES_ARCHIVE_URL` in `.env.example` references build 13890 but Dockerfile defaults to 14482. Pick one.

2. **`fivem-binaries/FXServer.exe` (Windows only)**
   - Required by `pnpm start:windows`. Directory is `.gitignore`'d. README says "extracted to `fivem-binaries/FXServer.exe`" but does not link the artifact URL or show the unzip step. **Cold-start blocker on Windows.**

3. **`txData/${SERVER_NAME}/server.cfg`**
   - Required by `start-windows.js:48` and `[default]/core` to actually run. **Does not exist on a fresh clone** — `txData/` is `.gitignore`'d, and the repo ships no template. New contributor will see "Error: server.cfg not found at ...". README does not show a sample `server.cfg`.

4. **`ensure <plugin-name>` in `server.cfg`**
   - For each generated plugin (`core`, `character-create`, `character-select`, `character-edit`) the operator must add an `ensure` line. Otherwise the build pipeline writes resources that FXServer ignores. README says it once, in passing, at line 68. It's the single thing most likely to cause "I built it but nothing happened" confusion.

5. **`[GENERATED]` folder semantics**
   - FiveM's bracket-folder rules mean `[GENERATED]` is itself a grouping, *not* a resource. Adding `ensure [GENERATED]` does nothing; the operator must `ensure` the inner resource names. Undocumented.

6. **MariaDB seeding**
   - `docker-compose.yml:21-32` provisions a MariaDB 10.5 sidecar with `MYSQL_DATABASE` and `MYSQL_USER`, but **no SQL is ever run against it** — no `volumes:` mount of an `init.sql`, no migration tool. The DB exists but is empty. Code never imports a SQL driver (verified by inventory §4). The DB is currently aspirational. New contributor wonders "where does the schema come from?"
   - **Fix:** either add `./db/init.sql:/docker-entrypoint-initdb.d/init.sql:ro` (idiomatic for the official `mariadb` image), or remove the DB until it's used.

7. **Companion reload resource**
   - `pnpm dev`'s hot-reload depends on `[default]/core` being running and listening on `3414`. After the first `pnpm build`, the operator must `ensure core` and restart FXServer once before `pnpm dev` will reload anything. The first run *after* that, `dev` works. New contributor's mental model — "watch should just work" — is wrong here.

8. **`port 30120` collision**
   - `start-windows.js:225-307` aggressively kills any process holding 30120 — including non-FXServer ones, after a y/n prompt at line 258. If the contributor's machine has another game/server on 30120 they'll be asked to terminate it. Also: the prompt blocks on stdin, so the script can't be run unattended.

9. **Build artifacts vs. source tree**
   - `src/webview/App.tsx` is a transient build artifact (CLAUDE.md warns; inventory §3 HIGH confirms it's currently leaked into git). New contributor opening that file sees "Auto-generated by BuildManager" and reasonably assumes it's safe to edit/delete. Both are wrong.

10. **Two package managers**
    - `pnpm install` at root, `npm install` inside `asset-server/` (auto-run by `pnpm start:assets`). Some IDEs auto-run `npm install` on open and corrupt the root tree.

11. **Plugin discovery is bracket-aware but folder discovery in `server.cfg` is not.**
    - The build emits to `[GENERATED]/[character]/[auth]/character-create/`. FXServer's recursive bracket walk picks this up (FiveM convention), but only if the operator hasn't manually written `ensure [character]` in `server.cfg` and expected it to fan out. `[UNVERIFIED]` whether `ensure [GENERATED]` works as a group ensure — depends on FXServer version.

12. **The `core` resource auto-watcher polls `dist/`, which is wrong.**
    - Inventory §2 HIGH: half of the auto-reload mechanism is dead. From a contributor's POV, they may notice that touching files outside `pnpm dev`'s knowledge does not auto-reload, and they'll have no clue why.

---

## 7. Versioning & releases

### Findings

- **MEDIUM — No release tooling, no changelog, no semver discipline.**
  - `package.json:3` is pinned at `1.0.0` and has been since the project's been tracked.
  - All four plugins are at `0.1.0` (`grep version src/plugins/**/plugin.json`). No script bumps them; nobody has bumped them.
  - No `CHANGELOG.md`, no `release-please.yml`, no `changesets/`, no `commitlint`, no conventional-commit enforcement (verified by Glob and grep).
  - Recent commit messages (`b2a8401e tiniest-fix`, `a0349440 ok`, `1d2355f6 fixes`, `b4bb0803 fixed scrolling`) make it impossible to derive a changelog from history alone.
  - **Fix (light):** adopt conventional commits + `release-please` for the root, and a single `pnpm version-plugins` script that walks `src/plugins/**/plugin.json` and bumps `version` from a top-level command. Until then, the `version` field in `plugin.json` is a vestigial constant that gets emitted into `fxmanifest.lua` but means nothing.

- **LOW — `fxmanifest.lua` carries a stale plugin version forever.**
  Because plugin authors won't bump `0.1.0` by hand, every shipped resource will report `version '0.1.0'` to FiveM admins indefinitely. Doesn't break runtime, but breaks any tooling that compares versions.

---

## 8. Error UX

Sampled four error paths that a new contributor will hit:

### 8a. Missing `SERVER_NAME` env var

Run: `pnpm build` (no `.env`).
- `build.ts:66` interpolates `process.env.SERVER_NAME` directly into `txData/${process.env.SERVER_NAME}/...`.
- Result: `distDir = 'txData/undefined/resources/[GENERATED]'`. Build proceeds, succeeds, writes to a directory the operator never expected. **No error message at all.**
- Rating: **0/10.** Silent corruption.
- **Fix:** at the top of `main()`, fail-fast: `if (!process.env.SERVER_NAME) { console.error('SERVER_NAME is required'); process.exit(1); }`.

### 8b. esbuild syntax error in plugin code

Path: `BuildManager.ts:347-384` (`buildPluginTs`).
- `esbuild.build` throws or returns `result.errors[]`. The catch wraps it: `throw new Error('Failed to bundle ${file.fullPath}: ${result.errors.join(", ")}');` — and the outer catch wraps **that** as `Failed to build TypeScript files for plugin <name>: <prev message>`. Then `buildSinglePlugin` (`build.ts:419-449`) wraps it again as `✗ Failed to build <name>: <prev>`.
- The original esbuild error object (which includes `text`, `location.file`, `location.line`, `location.column`) is lost in the `.join(", ")` on line 368 — `error.toString()` on an esbuild Message object is `[object Object]`-ish without explicit formatting.
- Rating: **3/10.** The user sees "Failed to build foo: ...[Message]: ...[Message]: undefined" and has to re-run with `--log-level=verbose` to get the stack trace, and the stack trace points at `BuildManager.ts`, not at the user's code.
- **Fix:** format `result.errors` with `esbuild.formatMessages(result.errors, { kind: 'error', color: true })` and print that directly. Don't re-wrap into generic `Error` objects — let the original through.

### 8c. Reload endpoint unreachable at watch startup

Path: `BuildManager.ts:62-74` (`initializeReloadManager`) → `PluginReloadManager.ts:84-108` (`initialize`).
- `makeRequest('/resources')` rejects with `connect ECONNREFUSED 127.0.0.1:3414`.
- `BuildManager.initializeReloadManager` swallows it: `console.warn(\`⚠ Failed to initialize reload manager: ${errorMessage}\`); console.warn('Plugins will be built but not automatically reloaded'); this.reloadManager = null;`.
- Rating: **6/10.** Honest about what failed and what the consequence is. Missing: *how to fix it* — operator needs to be told "is your FXServer running? did you `ensure core`? does `core` use the right `RELOADER_API_KEY`?". Three or four lines of remediation help would push this to 9/10.

### 8d. Vite build failure inside webview pipeline

Path: `BuildManager.ts:630-651` (`runViteBuild`).
- `npx vite build --outDir=...` runs with `stdio: 'inherit'`. If Vite fails, its formatted error goes straight to the user's terminal (good).
- The wrapping rejection `new Error(\`Vite build failed with exit code ${code}\`)` then surfaces up two layers and produces `Failed to build webview for plugin <name>: Vite build failed with exit code 1`.
- Rating: **7/10.** Vite's own error UX is excellent; the wrapping doesn't help but doesn't hurt either. Missing: the operator doesn't know that the next step is "look up at the previous 30 lines of stderr for the actual cause" — adding a "(see Vite output above)" hint would help.

### Summary

- Build failures from user code (8b) lose the most signal — that's the single highest-leverage UX fix.
- Env-var bugs (8a) are silent — second-highest leverage.
- Reload (8c) and Vite (8d) are acceptable.

---

## 9. Two package managers

### Findings

- **MEDIUM — Intentional split but poorly contained.**
  - Root: pnpm (`package.json:18`, `pnpm@10.8.0`). Lockfile: `pnpm-lock.yaml`.
  - `asset-server/`: npm (`asset-server/package-lock.json` exists; `package-lock.json` is in `.gitignore:14` so this is — wait, let me confirm). `.gitignore:14` does say `package-lock.json`, so the asset-server's `package-lock.json` should not be tracked. `[UNVERIFIED]` whether it's actually in git — `git ls-files asset-server/package-lock.json` would tell. From the directory listing it exists on disk.
  - `pnpm-workspace.yaml:1-6` lists `src/plugins/**` as workspaces but explicitly comments out `asset-server` ("# - 'asset-server'"). So the split is deliberate.
  - **Cost of unifying:** ~10 minutes. Add `asset-server` to `pnpm-workspace.yaml`. Replace the `start:assets` script `cd asset-server && npm install && npm start` with `pnpm --filter asset-server start`. Delete `asset-server/package-lock.json`. The cost is small because asset-server has no devDeps and no peer-dep awkwardness.
  - **Cost of keeping the split:** every contributor pays ~30s on `start:assets` first run for a redundant npm install, plus the cognitive overhead of two lockfiles in one repo.
  - **Workspace opportunity:** even better, list `src/plugins/**` (already declared but inert because plugins lack `package.json`) by giving each plugin a tiny `package.json` with its `name` and `version` matching `plugin.json`. That would let `pnpm --filter <plugin>` work and unlock per-plugin scripts.

- **LOW — The `pnpm-workspace.yaml:1` declaration that lists `src/plugins/**` finds zero packages today** because no `plugin/package.json` exists. The declaration is currently dead config. Either populate (per above) or remove the line.

- **NIT — `asset-server` has no `packageManager` pin**, so a contributor who runs `npm install` from inside `asset-server/` with whatever npm they happen to have installed gets non-reproducible behavior.

---

## 10. Lint / format

### Findings

- **HIGH — No ESLint, no Prettier, no `.editorconfig`, no pre-commit hook.**
  - Verified by Glob: no `.eslintrc*`, no `eslint.config.*`, no `.prettierrc*`, no `prettier.config.*`, no `.editorconfig`, no `.husky/`, no `lint-staged` config, no `commitlint`. (All matches in node_modules of dependencies, none at repo root.)
  - Code style is enforced by nothing. `BuildManager.ts` mixes `'` and `"`, has 8-space indents in some blocks and 2-space in others, mixes `Promise<void>` and `: Promise<void>` arrow body styles. No formatter would catch the inventory's repeated copy-paste pattern in the `buildPluginX` family of functions because there's no rule to flag duplication.
  - The single-eslint-disable comment in the codebase (`src/plugins/[default]/core/server/index.ts:467` `// eslint-disable-next-line @typescript-eslint/no-unused-vars`) is meaningful — it implies someone *expected* eslint to be configured at some point. Today it does nothing.
  - **Fix (minimum viable):**
    - `eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-react eslint-plugin-react-hooks` + a flat config covering all three tsconfig projects.
    - `prettier` + `.prettierrc` (single quotes, semis, 2-space).
    - `.editorconfig` (`indent_style = space`, `indent_size = 2`, `end_of_line = lf`, `insert_final_newline = true`).
    - Add `pnpm lint` and `pnpm format` scripts. Wire into the CI workflow proposed in §2.
    - Optional: `husky` + `lint-staged` for pre-commit. Skip if the team is small and CI is fast enough.

---

## Top 5 risks

1. **HIGH — Zero tests + zero CI.** Type errors, dependency drift, and regressions to the App.tsx swap, manifest emit, esbuild platform routing, and reload protocol have no automated guard. Combined with operator-targeted destructive output (`pnpm build` writes into the running server's resource tree), a bad commit can corrupt a live server with no warning.
2. **HIGH — `LICENSE` file missing despite README and `package.json` declaring ISC.** Distribution legality issue for any downstream consumer; one-line fix.
3. **HIGH — Onboarding has at least 7 undocumented blockers** (companion reload resource = `[default]/core` itself, missing `server.cfg`, missing `fivem-binaries/`, `BINARIES_ARCHIVE_URL` build mismatch, MariaDB schema not seeded, `ensure <plugin>` discoverability, leaked `App.tsx` artifact). A new contributor following only the README cannot get past `pnpm start:windows`.
4. **HIGH — No `docker-compose` healthchecks, no FiveM readiness probe, no log rotation.** `db` and `fivem` race at boot; logs grow until disk full; a hung-but-alive FXServer is never restarted by `restart: unless-stopped`.
5. **MEDIUM — Build error UX loses the original esbuild diagnostic.** Three layers of `try/catch` re-wrap the original error into a generic string; the file:line:column information that esbuild produces is dropped at `BuildManager.ts:368`. Contributors hit a syntax error and see "Failed to bundle ...: undefined" — they have no choice but to `--log-level=verbose` and read stack traces in framework code, not in their own.

---

## Open questions for later prompts

- **CI on Windows:** Is GitHub Actions on `windows-latest` worth adding? `start-windows.js` is Windows-only, but the build pipeline itself is OS-agnostic. `[UNVERIFIED]` whether `canvas@^2.11.2` builds cleanly on `windows-latest` without `node-gyp` setup.
- **Test harness for the in-game `core` resource:** the `RegisterCommand`/`GetResourceState`/`StopResource`/`StartResource` natives can't be unit-tested without an FXServer mock. `[UNVERIFIED]` whether `@citizenfx/server`'s types ship a stub-friendly export. If not, the reload-protocol test (§1 #3) needs to live as an integration test that spins up FXServer in a container.
- **Asset-server lock state:** `asset-server/package-lock.json` is in `.gitignore` but exists on disk. `git ls-files asset-server/package-lock.json` to confirm.
- **txAdmin readiness URL:** does `GET http://localhost:40120/` actually return 200 before FXServer has loaded resources, or only after? Affects whether the `fivem:` healthcheck (§3) measures the right thing.
- **Plugin `package.json` migration:** if each plugin gets a `package.json` for workspace integration (§9), does esbuild's discovery still work? `[UNVERIFIED]` — plugins use `plugin.json` not `package.json` for their manifest, but pnpm scans `package.json` for workspace roots; the two don't conflict but the contributor mental model gets noisier.
