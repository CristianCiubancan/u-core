# P4 — Security

Read-only security audit of U-Core as of `master @ ffae3e5e` (2026-05-02). Severity: CRITICAL / HIGH / MEDIUM / LOW / NIT. `[UNVERIFIED]` marks claims that would need a runtime check. Threat model: hostile player on the server, hostile coworker with repo access, compromised upstream binary URL.

---

## 1. `RELOADER_API_KEY` handling

### How it flows

| Stage | File:line | Behavior |
|---|---|---|
| Set in env | `.env:6`, `.env.example:6` | **Both files contain the literal string `***SCRUBBED***`** |
| Loaded — build side | `PluginReloadManager.ts:69` | `options.apiKey \|\| process.env.RELOADER_API_KEY \|\| ''` |
| Loaded — server side | `[default]/core/server/index.ts:9` | `process.env.RELOADER_API_KEY \|\| '***SCRUBBED***'` (hardcoded fallback) |
| Logged | `[default]/core/server/index.ts:10-14` | "API_KEY is configured" / "using default value" — but the truthy-check (`API_KEY ? 'configured' : 'using default value'`) is **always true** when the literal placeholder is in use, so the log lies. |
| Transmitted | `PluginReloadManager.ts:229` | `Authorization: Bearer ${this.apiKey}` over **HTTP plaintext** by default (`useHttps = false`) |
| Compared | `[default]/core/server/index.ts:198-200` | `providedKey !== API_KEY` — **non-constant-time** string compare |
| Bound to | `[default]/core/server/index.ts:285` | `server.listen(PORT)` — **no host argument** → Node default `'::'` (all interfaces) |

### Findings

- **CRITICAL — Production fallback to literal placeholder `'***SCRUBBED***'`.** `[default]/core/server/index.ts:9`. With no env var set, the in-game resource manager accepts requests authed by the literal string from `.env.example`. Combined with `docker-compose.yml:12` exposing port 3414 to the host, and the server binding all interfaces (no host arg on `server.listen`), any operator who skips env config exposes a remote `restartresource` / `restartallresources` endpoint on the public port. **Fix:** refuse to start when `RELOADER_API_KEY` is unset or equals the placeholder.

- **CRITICAL — Same placeholder is the *only* token the build-side ever sends.** `.env:6` and `.env.example:6` are byte-identical and ship `RELOADER_API_KEY=***SCRUBBED***`. So in this developer's actual setup the "secure" placeholder is in fact the live key. Anyone with knowledge of the placeholder can authenticate. **Fix:** rotate the key, regenerate from a CSPRNG, exclude `.env.example` from being a credential-bearing file (see §9).

- **HIGH — API key transmitted in plaintext HTTP.** `PluginReloadManager.ts:75-77` defaults to `http://`. Anyone on-path between the build host and FXServer reads the key. With both currently localhost-only this is "only" loopback, but the same code is reused in any deployment that puts the build host elsewhere. The `useHttps` option exists but the in-game server (`http.createServer`, line 176) doesn't speak TLS. **Fix:** require HTTPS or a Unix socket; or scope the key as a session token tied to a localhost-only listen.

- **HIGH — Endpoint binds all interfaces, not localhost.** `[default]/core/server/index.ts:285` calls `server.listen(PORT)` with no host. Node binds `0.0.0.0`/`::`. Combined with the Docker port publish (§2), the endpoint is reachable from any host that can route to the FXServer. **Fix:** `server.listen(PORT, '127.0.0.1')`. If remote dev is needed, gate behind a flag and document.

- **HIGH — Constant-time compare missing.** `[default]/core/server/index.ts:200`. `providedKey !== API_KEY` short-circuits on the first mismatching byte; timing leaks key length and per-byte progress. The local-only attack surface limits practical risk today, but the mitigation is one line. **Fix:** `crypto.timingSafeEqual(Buffer.from(providedKey), Buffer.from(API_KEY))` after equal-length check (and reject mismatched lengths uniformly). Already noted in audit/01-architecture.md §6 MEDIUM.

- **HIGH — CORS wildcard `Access-Control-Allow-Origin: *` on a privileged endpoint.** `[default]/core/server/index.ts:182`. Any web page the operator visits in a browser on the same machine can fire a `POST /restart` that triggers `restartallresources` — the request *will* fail without the API key, but the API key is `'***SCRUBBED***'` (CRITICAL above) so the wildcard CORS is the last line of defense and it's open. **Fix:** drop CORS entirely (this is not a public API), or restrict to `null`/`http://localhost:*`. Already noted in audit/01-architecture.md §6 LOW — upgraded here because the placeholder-key issue makes CORS load-bearing.

- **MEDIUM — Threat model: what an attacker with the key can do.** Verified by reading `restartResource` / `restartAllResources` (lines 37-173):
  - `POST /restart?resource=<name>` → arbitrary `StopResource`/`StartResource` on any FXServer-known resource.
  - `POST /restart` (no query) → mass restart of every resource. Attacker forces a denial of service by repeatedly stopping critical resources before FXServer can finish starting them (the 500ms `setTimeout` between Stop and Start, line 69, leaves a window). With `restartallresources` looping, the attacker can keep the server in a perpetually-restarting state.
  - The endpoint does **not** offer arbitrary code execution directly, but it can `StartResource` against any resource present in the server's resource path — including any malicious resource a coworker/insider drops into `txData/.../resources/`.
  - No rate limiting (`PluginReloadManager.ts` makes one call per build trigger, but the in-game server has no `rateLimit`).
  - **Fix:** in addition to the placeholder fix, add a per-IP rate limit (e.g., 10 req/min) and audit-log all restarts.

---

## 2. Reload endpoint network exposure

### What `docker-compose.yml` actually does

`docker-compose.yml:8-12`:
```
ports:
  - '30120:30120/tcp'
  - '30120:30120/udp'
  - '40120:40120/tcp'
  - '3414:3414'
```

The short syntax `'3414:3414'` publishes the port on **all host interfaces** (default bind `0.0.0.0`). Combined with the in-game listen (§1), every layer is `0.0.0.0`:

```
Internet → host 0.0.0.0:3414 → container 0.0.0.0:3414 → http server (any iface)
```

### Findings

- **CRITICAL — Port 3414 published on all host interfaces by default.** `docker-compose.yml:12`. There is no separate `pnpm dev` companion in the Docker image — the `[default]/core` resource is what listens on 3414, and it ships in the image. Combined with the placeholder-API-key fallback (§1) and the wildcard CORS, an internet-reachable host running `pnpm start:docker` exposes a remote-resource-control endpoint. **Fix:** bind the publish to localhost only: `'127.0.0.1:3414:3414'`. The reload endpoint is a developer feature, not something to expose to the internet.

- **HIGH — There is no docker-compose toggle for production.** The same compose file is used for dev and (by README direction) for any operator running `pnpm start:docker`. Operators copy `.env.example` and run; they get the placeholder key with the public port. **Fix:** split into `docker-compose.yml` (prod, no 3414, no resource-manager resource) and `docker-compose.dev.yml` (dev, with 3414 on localhost).

- **MEDIUM — `ports` short syntax behavior on Linux/Windows differs subtly.** Docker Desktop on Windows publishes `3414:3414` as `0.0.0.0:3414` on the WSL2 / Hyper-V interface, often firewalled by default. On Linux without firewall rules, it's wide open. `[UNVERIFIED]` for the Windows vs. Linux exposure of the actual operator host — depends on local firewall.

---

## 3. NUI ↔ client trust

### Handlers and validation

Verified by `grep -nE 'RegisterNuiCallback' src/plugins/**/client/*.ts`:

| Handler (events.ts) | Data type | Validation present? |
|---|---|---|
| `'character-create:toggle-ui'` (NUI_EVENT) | `SaveCharacterData` (close?, save?, characterData?) | None. `data.save && data.characterData` is checked, then `emitNet('character-create:save', data.characterData)` forwards verbatim. |
| `'character-create:update-model'` (events.ts:86) | `{ model: string }` | None. Direct `updateModel(data.model)` → `loadAndSetModel` → `GetHashKey(model)` + `SetPlayerModel`. |
| `'character-create:update-face'` (events.ts:99) | `{ key: keyof FaceData, value: number }` | None. Direct `updateFace(data.key, data.value)`. |
| `'character-create:update-hair'` (events.ts:112) | `{ key, value }` | None. |
| `'character-create:update-appearance'` (events.ts:125) | `{ category, key, value }` | None. Forwarded as object key dereference: `appearance[category][key] = value`. |
| `'character-create:update-clothing'` (events.ts:138) | `{ key, value }` | None. |
| `'character-create:rotate-camera'` (events.ts:151) | `{ direction }` | None. `direction` is forwarded into a switch by `rotateCamera`. |
| `'character-create:zoom-camera'` (events.ts:164) | `{ direction }` | None. |
| `'character-create:focus-camera'` (events.ts:177) | `{ focus }` | None. |
| `'character-create:rotate-player'` (events.ts:190) | `{ direction }` | None. |
| `'character-create:drag-camera'` (events.ts:203) | `{ deltaX, deltaY }` | Threshold check (`Math.abs(data.deltaX) > 5`) but no type-or-bound validation. `data.deltaY * 0.05` is forwarded — `null * 0.05 === 0`, but `'evil' * 0.05 === NaN` then passed to `zoomCameraByAmount`. |
| `'character-create:drag-end'` | `any` | None (no-op). |

### Findings

- **MEDIUM — No NUI-callback input validation.** `events.ts:57-242`. Every handler trusts the shape, type, and bounds of `data`. NUI callbacks come from the *plugin's own webview* (sandboxed Chromium inside FiveM), so the surface is technically lower than a network boundary — but a compromised webview asset (any client-side XSS in the React code, any third-party script loaded into the webview) gains direct access to game-state mutations and, via `'character-create:toggle-ui'`'s `save` branch, to `emitNet('character-create:save', ...)` with attacker-controlled payload. **Fix:** zod (or similar) schema validation at each callback entry; reject malformed inputs with `cb({ status: 'invalid' })`.

- **MEDIUM — `update-appearance` uses untrusted `category` and `key` for object indexing.** `events.ts:133`: `updateAppearance(data.category, data.key, data.value)`. If `category === '__proto__'` or similar, the implementation could prototype-pollute the runtime appearance store. **Fix:** allowlist `category` against the literal `keyof AppearanceData` set; reject everything else.

- **MEDIUM — `update-model` accepts an arbitrary string and feeds it to `GetHashKey` + `SetPlayerModel`.** `events.ts:94` → `character-manager.ts:36-77`. The model list is documented as `mp_m_freemode_01` / `mp_f_freemode_01` (shared/types.ts:10-13) but the handler does not enforce it. A webview vulnerability could change the player model to anything — most attempts fail (model not loaded), but combined with `RequestModel` (line 37) the handler will load arbitrary models. **Fix:** allowlist against `MODELS` from shared/types.ts.

- **LOW — `useNuiEvent` listener has no origin check.** `useNuiEvent.ts:17-44`. `MessageEvent` listeners can technically receive `postMessage` from anywhere; in CEF/NUI this is bound to the parent resource frame so practical risk is ~0, but the code does not validate `event.origin`. `[UNVERIFIED]` — depends on FiveM's NUI frame isolation. **Fix:** check `event.origin === 'nui://character-create'` (or whatever the parent resource origin is) before dispatching.

- **LOW — `simulateNuiEvent` ships in the production bundle.** `src/webview/utils/devtools.ts:10-34` is gated by `isEnvBrowser()` so it's a no-op at runtime in CEF — but the `setupDevTools` button factory is dead code in prod and adds attack surface (it dispatches synthetic `MessageEvent`s). `main.tsx` calls it under `isEnvBrowser()` only `[UNVERIFIED]`. **Fix:** dead-code-eliminate behind a Vite `define` or a build-time conditional.

---

## 4. Server-side trust (NetEvents)

Verified by grep across `src/plugins/**/server/*.ts`:

### Handlers

- **`'character-create:save'`** — `[character]/[auth]/character-create/server/index.ts:33-58`. Receives `CharacterData` from client. **No validation whatsoever.**
  - `source = global.source` (FiveM-provided client ID, trustworthy).
  - `console.log('[Character Create] Character data:', JSON.stringify(characterData))` — log injection possible (newlines in any string field flood logs).
  - "Here you would typically save the character data to a database" — currently a no-op + log + ack. So no SQL injection today, but the comment indicates intent to wire into MariaDB without sanitization.

- **`character-select`, `character-edit`** — server `index.ts` files are **empty** (0 bytes). No handlers, no surface today.

- **`[default]/core` server has no NetEvent handlers** (only HTTP routes — see §1).

### Findings

- **HIGH — Client → server `character-create:save` event has zero validation.** `server/index.ts:33-58`. The "save" path is a stub today, but the handler is registered (`onNet`) and accessible to any connected player. A player can `TriggerServerEvent('character-create:save', { /* arbitrary payload */ })` from their own client console (FiveM cheat tools or a modified resource). When the save is wired to MariaDB without an intervening validation pass, the schema mismatch (or stringly-typed JSON columns) becomes a SQLi/injection vector. **Fix:** zod-validate `CharacterData` at the server boundary *before* it reaches the (future) DB layer; reject malformed payloads, log+kick repeat offenders.

- **MEDIUM — Log injection via stringified character data.** server/index.ts:46 logs `JSON.stringify(characterData)`. JSON-stringified strings are quote-escaped, so `\n` would survive as the literal `\n` — meaning log injection actually doesn't fire here `[UNVERIFIED]` against the specific FXServer log writer. Still, logging arbitrary user-controlled strings unbounded is a DoS vector (huge payload → huge log lines → disk fill). **Fix:** truncate user payload before logging, or log only audit-relevant fields.

- **MEDIUM — `client-side` validation of NetEvent results.** `events.ts:251-269` handler for `'character-create:save-result'` calls `console.log` / `console.error` on `result` without type-checking. A malicious server (or a confused state) sending a non-object would throw. Practical risk ~0 (server is trusted); flagged for completeness.

- **MEDIUM — No event-name registration / no `RegisterNetEvent`.** `server/index.ts:26` uses `onNet` which auto-registers in modern FXServer, but the explicit `RegisterNetEvent` form (with subsequent `AddEventHandler`) historically gives better control over which events are network-callable. `[UNVERIFIED]` whether `onNet` defaults to network-callable in the pinned `@citizenfx/server@2.0.14482-1`. If yes, fine; if no, the event silently won't fire.

---

## 5. Secrets in build artifacts

### What's in `[GENERATED]/<plugin>/`

Verified by walking `txData/CFXDefaultFiveM_0838A6.base/resources/[GENERATED]/`:

- `fxmanifest.lua` (no secrets).
- `client/*.js`, `server/*.js`, `shared/*.js` — esbuild IIFEs with **inline base64 sourcemaps**.
- `html/index.html` + `html/assets/*.{js,css}` — Vite output, separate sourcemaps `[UNVERIFIED]` (depends on `vite.config.ts` — currently has no explicit `sourcemap` setting, defaults to `false` for `vite build`).
- `translations/*.json`, `*.json` files copied verbatim.
- **No `.env`, no `plugin.json`, no `node_modules/`** in dist. Good.

### What's in those inline sourcemaps

Decoded from `[default]/core/server/index.js`:

```json
"sources": [
  "../../../../../../../node_modules/.pnpm/dotenv@16.5.0/.../package.json",
  "../../../../../../../node_modules/.pnpm/dotenv@16.5.0/.../main.js",
  ...
  "../../../../../../../src/plugins/[default]/core/server/index.ts"
],
"sourcesContent": [<full original source of every file above>]
```

Decoded from `character-create/client/events.js`:

```json
"sources": [<7 paths under src/plugins/[character]/[auth]/character-create/>],
"sourcesContent": [<full original TypeScript of every plugin client file>]
```

### Findings

- **HIGH — Inline sourcemaps with `sourcesContent` ship to FiveM clients.** Verified at `txData/.../character-create/client/events.js`. esbuild config `sourcemap: 'inline'` (BuildManager.ts:356, 468) emits a base64 data-URI containing **the full original TypeScript source** of every client file. FiveM clients download all client-side scripts of every running resource, so every connecting player gets the complete source code, comments, and any embedded development URLs. For server bundles this is operator-only (acceptable). For client bundles this is data exfil. **Fix:** drop sourcemaps in client builds (`sourcemap: false` when `isServerScript === false`), or use external `.js.map` files that aren't in the manifest's `client_scripts` (so they're not auto-served). Note: the dev-experience cost is real — keep inline maps gated by a `--debug` build flag.

- **HIGH — Bundled `dotenv` library carries `process.env.RELOADER_API_KEY` lookup *and ships in the server bundle*.** Verified above. The literal *value* isn't embedded (it's resolved at runtime from the FXServer-process env), so no key leakage in the artifact. But: shipping `dotenv` into a FiveM resource means the resource calls `dotenv.config()` against an `.env` it tries to find — if any operator drops a `.env` into the resource's working directory, those values become the resource's environment. **Fix:** stop importing `dotenv/config` from in-game server scripts (`[default]/core/server/index.ts:2`); FXServer already provides env via `GetConvar`/`GetConvarInt` (used at line 283). Read `RELOADER_API_KEY` via `GetConvar('reloader_api_key', '')` instead.

- **MEDIUM — Bundled `dotenv` plus path-relative sourcemap reveals dev-machine pnpm structure.** The decoded sourcemap shows `node_modules/.pnpm/dotenv@16.5.0/...` paths — exposes dev-machine pnpm layout, version pin, and module resolution to anyone reading the bundle. Combined with the previous finding, removes plausible deniability about which dependency versions are in use. **Fix:** same as above (strip client sourcemaps), and remove `dotenv` from in-game server.

- **LOW — No absolute developer paths.** Verified — the sourcemap uses `../../../../../../../` relatives, not `D:/u-core/...`. esbuild's `sourceRoot` was not set, so it defaults to relative. Good.

- **LOW — Build timestamps in `fxmanifest.lua` and stub `App.tsx`.** Already noted in audit/03-build.md §7. Not a secret leak; just a determinism/diff-hygiene issue. Cross-reference.

---

## 6. Dockerfile supply chain

### Current state

`Dockerfile:11-23`:
```
ARG BINARIES_ARCHIVE_URL=https://runtime.fivem.net/.../14482-1eed77dd.../fx.tar.xz
RUN ... curl -L "$BINARIES_ARCHIVE_URL" -o /tmp/fx.tar.xz && \
    tar -xf /tmp/fx.tar.xz -C /root/binaries && \
    rm /tmp/fx.tar.xz
```

- **No checksum verification.** `curl -L` follows redirects and writes whatever the URL returns to disk; `tar -xf` extracts whatever was written. A compromise of `runtime.fivem.net` (or DNS, or any TLS interception in the build chain) injects arbitrary binaries.
- **No signature verification.** CFX does publish FXServer artifacts but the build doesn't verify a PGP/minisign/cosign signature.
- **The URL is build-time-pinned to a specific commit hash** (`14482-1eed77dd20d49bab1a41f89427adafea7781a3fd`) which is a per-version content-addressed path on the CFX CDN. So if the URL is unchanged, the tarball *should* be reproducible — but there's no checksum *in the repo* to compare against, so a future CDN swap (or a typo in the URL) is undetected. The version itself disagrees with `.env.example`'s URL (build `13890`) — see audit/00-inventory.md §4 HIGH.
- **`curl -L` with no `--fail`.** A 404 / 500 response with HTML body would still write to `/tmp/fx.tar.xz`, then `tar -xf` would fail on the malformed archive. Not a security issue, but the failure mode is opaque.

### Findings

- **HIGH — FXServer binaries downloaded over HTTPS without checksum or signature verification.** `Dockerfile:21`. Compromise of `runtime.fivem.net`, the CDN, or any MITM with a valid TLS cert for the host injects native code that runs as the FXServer process owner. Server runs as `root` (Ubuntu 20.04 base, no `USER` directive — line 1, line 31). **Fix:** pin a SHA256 in the Dockerfile and `sha256sum -c` after download. Add a `--fail-with-body --proto =https --tlsv1.2` to curl. Drop privileges with `USER fivem` after extraction.

- **HIGH — Build runs as root and the runtime CMD also runs as root.** Dockerfile has no `USER` directive. The default user is root for `FROM ubuntu:20.04`. Any RCE in FXServer or any resource = root in the container = full container compromise = host privilege depending on Docker config. **Fix:** add `USER fivem` (after creating that user) before `CMD`.

- **HIGH — `git`, `curl`, `tar`, `xz-utils` left installed in the runtime image.** Dockerfile:4-9 installs build-tools, never removes them. An attacker who finds RCE in FXServer gets `git clone` / `curl | sh` / `tar` ready to use. **Fix:** multi-stage build — first stage extracts the archive, second stage `COPY --from=...` only the needed binaries.

- **HIGH — `BINARIES_ARCHIVE_URL` build-arg vs `.env` runtime env disagree.** Dockerfile default `14482-1eed77dd...`, `.env.example`/`.env` runtime `13890-ad6c90072...`. The Dockerfile `ENV` line 16 then sets the runtime env to whatever the build-arg was, which docker-compose may override at build via `args` (`docker-compose.yml:5-6`) but not at run. Net: the FXServer running in the container is whichever version was extracted at build time, regardless of what `.env` says. The disagreement is also a supply-chain footgun — operators reading `.env` think they have build 13890 but actually have 14482 (or whatever the Dockerfile defaulted to). Already noted in audit/00-inventory.md §4 HIGH; reiterated for security framing.

- **MEDIUM — Ubuntu 20.04 (Focal) is approaching EOL.** Standard support ends April 2025; ESM until April 2030 but requires Ubuntu Pro. Container will stop receiving free security updates soon. **Fix:** bump to `ubuntu:24.04` (LTS, supported through 2029) or `debian:12-slim`.

- **MEDIUM — `apt-get install -y` without `--no-install-recommends` and without `apt-get upgrade`.** Dockerfile:4-9. Pulls in suggested dependencies. Doesn't apply security updates available since the base image was tagged. **Fix:** add `--no-install-recommends`; consider `apt-get upgrade` (with the usual reproducibility tradeoff) or pin a digest.

---

## 7. MariaDB exposure

### What `docker-compose.yml` does

```yaml
db:
  image: mariadb:10.5
  environment:
    MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}     # → '***SCRUBBED***' from .env.example
    MYSQL_DATABASE: ${MYSQL_DATABASE}                # → 'fivem'
    MYSQL_USER: ${MYSQL_USER}                        # → 'root'  ← invalid
    MYSQL_PASSWORD: ${MYSQL_PASSWORD}                # → '***SCRUBBED***'
  ports:
    - '3306:3306'                                     # ← exposed to all interfaces
```

### Findings

- **CRITICAL — Database root password committed in plaintext to `.env.example`.** `.env.example:23-26` contains `MYSQL_ROOT_PASSWORD=***SCRUBBED***` and `MYSQL_PASSWORD=***SCRUBBED***`. These are real-looking passwords (Romanian phrases — "spune-mi smail" and a longer Romanian sentence). Also tracked in `git`: `.env.example` is in git and has been since the `init` commit per `git log`. **The local `.env` contains the same values.** Any clone of the repo carries these credentials. Even after a fix, they are in git history. **Fix:** rotate immediately, replace with `<replace-me>` placeholders in `.env.example`, and consider git history rewrite if these are anywhere production-reachable (or revoke the credentials and forget about history).

- **CRITICAL — Port 3306 published on all host interfaces by default.** `docker-compose.yml:32`. Same shape as 3414 (§2) — the short syntax binds `0.0.0.0`. Combined with the credential leak above, an internet-reachable host running `pnpm start:docker` gives an attacker direct MariaDB access with root credentials. **Fix:** drop the `ports:` block entirely (the FiveM container reaches DB via Docker DNS over the internal network); or bind to localhost: `'127.0.0.1:3306:3306'`.

- **HIGH — `MYSQL_USER=root`.** `.env`/`.env.example:25`. MariaDB rejects `root` as `MYSQL_USER` (it's reserved); the container will warn at startup and skip user creation, leaving only the auto-created root user with `MYSQL_ROOT_PASSWORD`. So the *application* (whatever connects with `MYSQL_USER`/`MYSQL_PASSWORD`) is effectively logging in as root with the MYSQL_PASSWORD value as a *non-root* secondary user — which doesn't exist. Net: app can't authenticate, or the operator has had to manually patch around this. `[UNVERIFIED]` what the actual deployment looks like. **Fix:** set `MYSQL_USER=fivem` (or any non-`root` name).

- **HIGH — No network isolation between FiveM and DB.** `docker-compose.yml` does not declare any `networks:`. Both services land on the default bridge, fine for service-to-service, but the DB has `ports:` published, so it's reachable from outside the bridge too. **Fix:** declare a private network for db, omit `ports:` from db.

- **MEDIUM — MariaDB 10.5 is in maintenance support only.** General availability ended; security maintenance until July 2025. **Fix:** bump to MariaDB 11.x LTS (e.g., 11.4) and verify any client code still works.

- **MEDIUM — No volume backup policy or `volumes: [/var/lib/mysql:Z]` SELinux label.** `docker-compose.yml:28-29` mounts `db_data:/var/lib/mysql`. Defaults are fine for dev; flag for prod hardening.

- **LOW — No DB driver in `package.json`.** Audit/00-inventory.md §6 already noted this. The MariaDB sidecar exists but no application code connects to it today. The credentials are exposed and unused, which makes them noise — until they're wired up, at which point the placeholder-leak above becomes load-bearing.

---

## 8. Dependency CVEs

### Root (`pnpm audit --prod`)

`28 vulnerabilities — 19 high, 7 moderate, 2 low`. HIGH summary (production deps only):

| Package | Path | Vuln | Notes |
|---|---|---|---|
| `lodash@4.17.21` | direct dep | GHSA: code injection via `_.template` (high); prototype pollution via `_.unset`/`_.omit` (moderate) | `lodash` is in deps but **never imported** (audit/00-inventory.md §4 MEDIUM). Pure dead weight. |
| `glob@11.0.x` | direct dep | GHSA: glob CLI command injection via `-c/--cmd` (high) | We use the JS API, not the CLI. False-positive in practice. |
| `minimatch <3.1.4` / `<9.0.7` / `<10.2.3` | transitive (via tailwindcss, glob, canvas) | ReDoS via repeated wildcards / nested extglob (high, multiple advisories) | Build-time only (tailwindcss, sucrase, glob); attacker would need to control glob patterns. **No runtime exposure** for the FiveM resources. |
| `tar <=7.5.10` | transitive via `canvas → @mapbox/node-pre-gyp → tar` | Multiple high: hardlink path traversal, drive-relative linkpath, symlink poisoning | Build-time install of native canvas. Risk = malicious npm tarball during `pnpm install`. Production-only because `canvas` is in `dependencies`. |
| `picomatch <2.3.2` | transitive via tailwindcss → chokidar → anymatch | ReDoS (high) | Build-time. |
| `postcss <8.5.10` | direct dep | GHSA: XSS via unescaped `</style>` in stringify output (moderate) | Build-time only; not bundled into resources. |
| `brace-expansion` (older versions) | transitive | ReDoS (low) | Build-time. |

### Asset-server (`npm audit`)

`0 vulnerabilities`. Express 4.x + cors + compression + sharp + dotenv all clean at install-time pin.

### Findings

- **HIGH — `lodash` HIGH-severity prototype-pollution / code-injection in production deps, package is unused.** `package.json` deps include `lodash@^4.17.21`. `pnpm audit` flags `_.template` code-injection (high) and `_.unset`/`_.omit` prototype-pollution (moderate). **Audit/00-inventory.md §4 MEDIUM** confirmed `lodash` is never imported. **Fix:** remove from `dependencies`. (Same goes for `fs-extra`, `glob-promise`, `image-js`, `rimraf`, `esbuild-wasm` — all unused, all add unnecessary advisory surface.)

- **MEDIUM — `canvas` pulls in vulnerable `tar` (HIGH advisories) at install time.** `package.json` deps. The vulns trigger only during `npm install` if a malicious package replaces a dep in the tree (supply chain) and node-pre-gyp tries to extract a malicious archive. `pnpm` mitigates with the lockfile, but a fresh install on a different machine without `--frozen-lockfile` could fetch newer transitive versions. **Fix:** `pnpm install --frozen-lockfile` in CI; consider whether `canvas` is actually used (audit/00-inventory.md §2 LOW questioned this — `canvas` is `external`'d in server bundles via `BuildManager.ts:359` but no plugin actually imports it `[UNVERIFIED]`).

- **MEDIUM — `postcss` XSS advisory in production deps.** Build-time only — postcss runs during `pnpm build` to compile Tailwind into CSS. Output CSS is then served to NUI Chromium frames. The XSS is in `postcss`'s own stringifier (input has `</style>` in a string node), not in user CSS. **Fix:** bump to `>=8.5.10` (`pnpm up postcss`); also confirm nothing user-controlled feeds into Tailwind config.

- **LOW — Build-time ReDoS advisories (minimatch, picomatch, brace-expansion).** All transitive. Attacker would need to control glob patterns fed to the build system, which means attacker-controlled `plugin.json` or `tsconfig.json` — i.e., attacker is already inside. **Fix:** `pnpm dedupe` after upgrading top-level deps; otherwise low priority.

- **NIT — `pnpm audit` lists ~15 of these vulns under transitive paths that would be eliminated by removing unused root deps.** Pruning (audit/00-inventory.md §4) would shrink the advisory surface materially.

---

## 9. `.env` in repo

### Current state

| File | Tracked? | Contains real secrets? |
|---|---|---|
| `.env` | **No** (gitignored, line 3 + 51) | **Yes** — MYSQL_ROOT_PASSWORD=`***SCRUBBED***`, MYSQL_PASSWORD=`***SCRUBBED***` |
| `.env.example` | **Yes** (in `git ls-files`) | **Yes — same values as `.env`** |

`.env.example` is **byte-identical** to `.env`. They were likely created together; `.env.example` was committed because the developer intended it as a template, but it's a copy of the live secrets file.

### Findings

- **CRITICAL — `.env.example` contains real secrets and is committed to git.** Contains `MYSQL_ROOT_PASSWORD=***SCRUBBED***`, `MYSQL_PASSWORD=***SCRUBBED***`, `RELOADER_API_KEY=***SCRUBBED***` (not a real secret but treated as one), and a specific `BINARIES_ARCHIVE_URL`. Any clone of the repo (public or private) reveals these to whoever has read access to git history. They are present in commits going back to `4192a12c init`. **Fix:** (1) immediately rotate `MYSQL_ROOT_PASSWORD`, `MYSQL_PASSWORD` if these credentials were ever used in any reachable system; (2) replace `.env.example` with `<replace-me>` placeholders; (3) if the repo is public or has many readers, do a git history rewrite (`git filter-repo`) to scrub the file from history; (4) audit any deployment that may have used these credentials.

- **HIGH — `.env` and `.env.example` are byte-identical.** Indicates the operator copies `.env.example` → `.env` and never edits — meaning whatever ships in `.env.example` becomes the operational config. The "you should change these" intent is invisible. **Fix:** make `.env.example` self-rejecting at startup — fail fast if it sees `<replace-me>` or `***SCRUBBED***`.

- **MEDIUM — `.gitignore` has duplicate `.env` entries** (lines 3, 51) and duplicate `node_modules` (12, 13, 44) — cosmetic but suggests the file accreted without review. Easy to miss a critical `.env.local` or `.env.production` that should also be ignored. **Fix:** consolidate into one `# Secrets` block: `.env`, `.env.*`, `!.env.example` (with the example actually being placeholder-only).

- **NIT — `crawl_py_files.py`, `server.txt`, `crawled.txt`, `crawl.py`, `*-bkp` are in `.gitignore`** (lines 4-5, 11, 82-83) — implies these once existed and may still exist locally with potentially sensitive content (crawl outputs often contain logs, secrets, snapshots). Worth a one-off `find . -name '*-bkp' -o -name 'server.txt' -o -name 'crawled.txt'` to confirm none survived.

---

## 10. Asset server

### Reachability

`asset-server/server.js` is a separate Express app (asset-server/package.json declares `start: node server.js`). It's **not** referenced by `docker-compose.yml`. Operator runs it manually via `pnpm start:assets` (calls `npm start` in the sub-package — see CLAUDE.md). It binds to `process.env.PORT || 3000` (asset-server/server.js:16) on all interfaces (no host arg on `app.listen`, line 258 — Express default).

The character-create webview hits `process.env.ASSET_SERVER_URL || 'http://localhost:3000'` (`getClothingImage.ts:40`), so the runtime expects it on localhost. But `vite.config.ts` `define`s `'process.env.ASSET_SERVER_URL': JSON.stringify('https://localhost:3000')` — https in the build, http in the fallback. Audit/00-inventory.md §3 LOW.

### Authn / authz

- **None.** No API key, no JWT, no IP allowlist, no rate limit.
- `cors()` with no options → `Access-Control-Allow-Origin: *` (asset-server/server.js:25). Anyone can fetch anything served.

### Path traversal

`asset-server/server.js:73-99`:
```js
app.get('/assets/:quality/*', (req, res) => {
  const quality = req.params.quality;
  const assetPath = req.params[0];
  if (!qualityDirs.includes(quality)) return res.status(400)...;
  const filePath = path.join(config.publicDir, quality, assetPath);
  if (!fs.existsSync(filePath)) return res.status(404)...;
  res.sendFile(filePath);
});
```

- `req.params[0]` is the URL-decoded captured path (Express decodes percent-encoding before route matching, but **does not normalize `..` segments inside the captured glob**).
- `path.join(config.publicDir, quality, assetPath)` accepts `..` and resolves them — `path.join('/app/public', 'high', '../../../etc/passwd')` = `/etc/passwd`.
- Express's URL parser collapses `..` *segments in the URL* before routing in some versions, but URL-encoded `..` (`%2e%2e`) tends to survive, and in any case `path.join` will resolve them again.
- `res.sendFile(filePath)` will send any readable file the Node process has access to.
- The `fs.existsSync` check does not prevent traversal — it just requires the target to exist.

The same pattern is repeated at lines 102-137 (`/thumbnails/:quality/*`), 140-167 (`/thumbnails/*`), 170-188 (`/assets/*` default-quality).

### Findings

- **CRITICAL — Path traversal in `asset-server` wildcard routes.** asset-server/server.js:75-98, 102-137, 140-167, 170-188. `path.join(publicDir, quality, req.params[0])` does not constrain to `publicDir`. A request like `GET /assets/high/%2e%2e/%2e%2e/etc/passwd` (or various Express-version-dependent encodings of `..`) escapes the public directory and serves any file the process can read. With `cors: *` and no auth, **anyone** on the network reaches this. `[UNVERIFIED]` exact encoding that bypasses Express's URL normalization — depends on Express 4.18.x behavior — but the absence of any explicit traversal guard is unambiguous. **Fix:** resolve and validate:
  ```js
  const resolved = path.resolve(filePath);
  const root = path.resolve(config.publicDir);
  if (!resolved.startsWith(root + path.sep)) return res.status(403).send('Forbidden');
  ```
  Or (simpler) use `express.static(publicDir)` which has built-in traversal protection.

- **HIGH — `res.sendFile(filePath)` without `root`/`dotfiles` options.** asset-server/server.js:98, 127, 136, 157, 166, 187. By default, `sendFile` allows any absolute path; with `root` set, it constrains to that root and rejects `..`. **Fix:** `res.sendFile(assetPath, { root: path.join(config.publicDir, quality), dotfiles: 'deny' })`.

- **HIGH — No authn/authz, public CORS, no rate limit.** asset-server/server.js:25. The asset server is reachable to anyone who finds the port. While the *intended* content is non-sensitive (clothing thumbnails), §10 traversal turns it into an arbitrary-file-read. Even ignoring traversal, an attacker can scrape and DoS the server (sharp re-encoding is CPU-heavy; `optimize.js` is presumably the producer of the `public/` content `[UNVERIFIED]`). **Fix:** at minimum, add a shared-secret token; better, place behind a reverse proxy that enforces TLS, rate limit, and authn.

- **MEDIUM — Binds to all interfaces, no `listen(port, '127.0.0.1')`.** asset-server/server.js:258. Same shape as §1, §2, §7 — Node/Express default. If the operator runs the asset server on the same host as FiveM (the documented setup), it's reachable from the public internet unless firewalled. **Fix:** bind to localhost; let a reverse proxy expose it if needed.

- **MEDIUM — `X-XSS-Protection: 1; mode=block` is a deprecated header that can introduce vulnerabilities in older Edge.** asset-server/server.js:31. Modern browsers ignore it; some legacy implementations actively misbehave. **Fix:** remove. Add CSP / `Cross-Origin-Resource-Policy: same-site` instead.

- **LOW — `cacheMaxAge` is read from env without parsing.** asset-server/server.js:19: `process.env.CACHE_MAX_AGE || 86400` — string concatenation into `Cache-Control: public, max-age=${...}`. If the env contains `0; private; X-Evil: true`, response splitting via header injection isn't possible because `Cache-Control` value-quoting kicks in, but the value is still unvalidated. **Fix:** `Number.parseInt(...) || 86400`.

- **LOW — Root route emits an HTML page describing the route shape.** asset-server/server.js:191-255. Fingerprinting aid for attackers — confirms the server type, the quality levels, the route patterns. Combined with §10 traversal, helpful reconnaissance. **Fix:** disable the help page in production (env-gate).

---

## Top 5 risks

1. **CRITICAL — Real database credentials committed to `.env.example`.** `MYSQL_ROOT_PASSWORD=***SCRUBBED***`, `MYSQL_PASSWORD=***SCRUBBED***` are in git history since the initial commit. Combined with `docker-compose.yml:32` publishing `3306:3306` on all interfaces and `MYSQL_USER=root` (likely broken DB user creation), any internet-reachable deploy of `pnpm start:docker` gives an attacker root MariaDB access with documented credentials. Rotate now and consider history rewrite. [§7, §9]
2. **CRITICAL — Path traversal in `asset-server`.** `path.join(publicDir, quality, req.params[0])` with no traversal guard, `res.sendFile` without `root` option, `cors: *`, no auth, binds all interfaces. Any client can read any file the asset-server process can read. [§10]
3. **CRITICAL — Reload endpoint accepts placeholder API key by default and is published on `0.0.0.0:3414`.** `[default]/core/server/index.ts:9` falls back to `'***SCRUBBED***'`; `.env`/`.env.example` ship that exact literal; `docker-compose.yml:12` publishes the port; `server.listen(3414)` binds all interfaces; auth compare is non-constant-time; CORS is `*`. An attacker who reaches the host can `restartallresources` in a loop. [§1, §2]
4. **HIGH — Inline base64 sourcemaps with `sourcesContent` ship to FiveM clients.** `BuildManager.ts:356, 468` set `sourcemap: 'inline'` for all builds, including client-platform bundles that get downloaded by every connecting player. Decoding shows the full original TypeScript of every plugin client file. Drop sourcemaps in client builds. [§5]
5. **HIGH — FXServer binaries downloaded over HTTPS without checksum/signature.** `Dockerfile:21` curls `BINARIES_ARCHIVE_URL` and tar-extracts; container runs as root; build-tools left in the runtime image; URL pin disagrees with `.env.example`. Compromise of the CDN or the URL pins arbitrary native code as PID 1. [§6]

---

## Open questions for later prompts

- **Asset-server traversal — exact encoding that bypasses Express 4.18.x route matching.** `[UNVERIFIED]` — would need a runtime test against the running server. The vulnerability shape is unambiguous (no explicit guard), but the precise URL form depends on Express version semantics for percent-decoded `..` in glob captures.
- **`event.origin` on NUI MessageEvents in CEF.** `[UNVERIFIED]` what FiveM sets as origin for resource webview frames; would need a runtime probe.
- **`onNet` vs explicit `RegisterNetEvent`.** `[UNVERIFIED]` whether `onNet` in `@citizenfx/server@2.0.14482-1` auto-registers as network-callable.
- **Docker port-publish on Windows host.** `[UNVERIFIED]` — does Docker Desktop on Windows expose `0.0.0.0:3414` past the Windows firewall by default? The compose file says `'3414:3414'`; the actual exposure depends on the operator's firewall config.
- **Repo visibility.** `[UNVERIFIED]` whether the GitHub remote is public or private; that determines whether the §9 credentials are already exposed to the internet.
