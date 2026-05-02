# P2 — Type Safety & Project References

Read-only type-safety audit of the U-Core build framework as of `master @ ffae3e5e` (2026-05-02). Severity tags follow CRITICAL / HIGH / MEDIUM / LOW / NIT. `[UNVERIFIED]` marks claims that would need a runtime check (e.g., `tsc --build`).

Several findings overlap with audit/00-inventory.md and audit/01-architecture.md; cross-references appear inline. The framing here is type-system specifically.

---

## 1. tsconfig hygiene

`tsconfig.json` is a solution file with three references: `tsconfig.scripts.json`, `tsconfig.plugins.json`, `tsconfig.webview.json`. The intended split (Node tooling / plugin client+server / NUI+plugin html+plugin shared) is correct on paper. The execution leaks in three directions.

### Findings

- **HIGH — `tsconfig.scripts.json` is not `composite`, but is referenced from the solution file.** `tsconfig.scripts.json:3` carries the comment `// Removed composite/incremental build to ensure fresh emit when outDir is cleaned`. `tsconfig.json:6` lists it under `references`. Project references *require* the referenced project to set `composite: true`; `tsc --build` errors out otherwise. Result: the solution file is broken for `tsc -b` from the root. Plugins/webview are validated, scripts are not — and it's silent because the team uses `tsx` to run scripts and never invokes `tsc -b`. **Fix:** either re-enable `composite` (the "fresh emit" concern is a non-issue when you rm -rf the outDir before build), or drop `tsconfig.scripts.json` from `references` and let it stand as an independent tsconfig.

- **HIGH — `tsconfig.plugins.json` has no `types: []` array, so every typing package under its `typeRoots` becomes globally ambient.** `tsconfig.plugins.json:17` sets `typeRoots: ["node_modules/@types", "node_modules/@citizenfx"]` and the absent `types` list means *all* packages directly under those directories load globally. Concretely:
  - `@citizenfx/client` natives are ambient *for plugin server code* — server scripts can call `SendNUIMessage(...)` and `RegisterNuiCallback(...)` and tsc won't complain.
  - `@citizenfx/server` natives are ambient *for plugin client code* — client scripts can call `StopResource('foo')`, `StartResource('foo')`, `GetPlayerEndpoint(src)` (verified server-only in `node_modules/@citizenfx/server/natives_server.d.ts:3288/3301`). At runtime these natives don't exist on the client side and the script crashes on first call.
  - `@types/node` is ambient — `process.env`, `Buffer`, `setTimeout`, `__dirname`, `require`, etc. all typecheck in plugin client code (which runs in CitizenFX V8, not Node).
  - `@types/glob`, `@types/lodash.debounce`, `@types/fs-extra`, `@types/react`, `@types/react-dom` are also ambient. Most are module-only (no globals) so impact is limited, but the surface is wider than intended.
  
  **Fix:** add `"types": ["@citizenfx/client"]` (or `["@citizenfx/server"]`) to the plugin tsconfig, and split client- and server-side type sources into two tsconfigs — `tsconfig.plugins.client.json` and `tsconfig.plugins.server.json` — each with its own `types` list. Or use `/// <reference types="..." />` directives only and remove `typeRoots` entirely.

- **HIGH — `tsconfig.webview.json` has no `typeRoots` and no `types`, so `@types/node` is implicitly ambient in NUI/browser code.** With both unset, tsc defaults to scanning `node_modules/@types/*`. `@types/node` declares `process`, `Buffer`, `setTimeout` (Node return types — different from DOM `Window.setTimeout`), `globalThis`, `URL`, etc. as globals, and they all win against the DOM ambient lib because there's no `types` filter. Direct evidence: `src/plugins/[character]/[auth]/character-create/html/utils/getClothingImage.ts:40,74,107,141` reads `process.env.ASSET_SERVER_URL` and typechecks. The runtime is the FiveM NUI browser (CEF/Chromium) — there is no `process` global. It only works because Vite `define`s `process.env.ASSET_SERVER_URL` at build time (`vite.config.ts:13,20`), which is a fragile workaround. Any other `process.cwd()` / `Buffer.from(...)` / `setImmediate(...)` would compile and crash at runtime. **Fix:** set `"types": ["vite/client", "@types/react", "@types/react-dom"]` (or equivalent) to whitelist exactly what NUI code needs.

- **MEDIUM — `src/plugins/**/shared/**/*` is included in BOTH `tsconfig.plugins.json` and `tsconfig.webview.json`.** Plugins config (line 19-20) includes the whole `src/plugins/**/*` and only excludes `**/html/**`; webview config (line 31) re-includes shared explicitly. Same files compile under `lib: ["es2022"]` (plugins) AND `lib: ["ES2020", "DOM", "DOM.Iterable"]` (webview). With `noEmit: true` on the webview side there is no double emit, but a shared file that uses a DOM type would pass under webview and fail under plugins (or vice-versa with Node globals from the leaked `@types/node`). This already breaks the audit/01-architecture.md §4 finding about `shared/` typing. (Cross-ref: 00-inventory.md §2 LOW; 01-architecture.md §4 LOW. Listed here as MEDIUM because of the lib mismatch, not just overlap.) **Fix:** add `**/shared/**/*` to the plugins exclude, or move shared files into a top-level `src/shared/` with its own dedicated tsconfig and have both projects reference it.

- **MEDIUM — `tsconfig.plugins.json` declares the same intent for client AND server code under one project, but the platforms are different.** Plugin client code targets CitizenFX V8 (no `process`, no `Buffer`, has `SendNUIMessage`, has GTA natives); plugin server code targets a different CitizenFX V8 (has `process`, has `Buffer`, has `StopResource`/`StartResource`, has different natives). The current setup loads both `@citizenfx/client` and `@citizenfx/server` ambient — typechecking lies about what's available on each side. The path-based runtime detection (`isServerScript`, BuildManager.ts:911) draws the line at bundle time, but tsc has no equivalent. **Fix:** split into two tsconfigs (client/server) with disjoint `types` lists, or accept that this needs `/// <reference>` directives at the top of every file. Currently the directives exist (`/// <reference types="@citizenfx/client" />` in client files, `/// <reference types="@citizenfx/server" />` in server files) but they are *additive* not *exclusive* — both type packs are still ambient via typeRoots.

- **LOW — `tsconfig.plugins.json:19` includes nonexistent `./src/core/**/*`.** `src/core/` does not exist (verified). Stale entry. (Cross-ref: 00-inventory.md §2 LOW.) **Fix:** remove.

- **LOW — `tsconfig.webview.json:34` redundantly includes `src/webview/theme/tailwind.config.ts`.** It's already covered by the `src/webview/**/*` glob on line 29. **Fix:** drop the explicit entry, or — if the intent was to *only* include this one file (and exclude the rest) — restructure with `exclude`.

- **LOW — `tsconfig.webview.json` sets both `composite: true` and `noEmit: true`.** Webview is consumed by Vite (which calls esbuild) and by esbuild directly in BuildManager — tsc never emits anything. `composite` requires (and TypeScript turns on) `declaration: true` and similar settings, but with `noEmit` the only artifact is the `.tsbuildinfo` file. Practically harmless but makes the configuration noisy. **Fix:** drop `composite` (and remove the project reference from `tsconfig.json`) — type-checking is still possible via `tsc --noEmit -p tsconfig.webview.json`.

- **NIT — Files outside any tsconfig.**
  - `vite.config.ts` (root)
  - `postcss.config.mjs` (root)
  - `scripts/start-windows.js` (top-level scripts/)
  - `asset-server/server.js`, `optimize.js`, `scaledown.js`
  - `src/utils/schema.json` (only consumed by editor JSON-schema tooling, not imported)
  
  These don't break anything because Vite/Node resolve them at runtime, but they're not type-checked anywhere. (Note: `vite.config.ts` is loaded by Vite which has its own typecheck pass via esbuild, so it's not raw-untyped — just not in the solution.) **Fix:** add a fourth tsconfig for build-config files, or accept the gap.

---

## 2. DOM lib leakage in client/server

Direct DOM type usage in `src/plugins/**/{client,server}/**`: **none found** (verified by grep for `window`, `document`, `navigator`, `HTMLElement`, `MessageEvent`, etc.). Client-side code uses `setTimeout` (`character-create/client/utils.ts:7`), but `setTimeout` is declared by `@citizenfx/client/index.d.ts:115`, not from DOM lib.

The risk is structural rather than instance-level — see §1 HIGH on `tsconfig.plugins.json` typeRoots.

### Findings

- **HIGH — Plugin server and client code both have `@citizenfx/client` *and* `@citizenfx/server` type packs ambient.** Re-iteration of §1 HIGH from a different angle. Verified by `grep -n "^declare function" node_modules/@citizenfx/client/natives_universal.d.ts` and `node_modules/@citizenfx/server/natives_server.d.ts`. The two packs declare overlapping name spaces (e.g., `GetCurrentResourceName` exists in both — universal client at line 11239, also in server). They also declare *non-overlapping* names (`StopResource`/`StartResource` are server-only at server.d.ts:3288/3301; not in `client/natives_universal.d.ts`). A client script can call `StopResource(name)` and tsc accepts it. Confirms a known footgun documented in CLAUDE.md but never enforced at the tsconfig layer. **Fix:** see §1 HIGH.

- **MEDIUM — `@types/node` is ambient in plugin client code via the `node_modules/@types` typeRoot.** Plugin client code can `import * as fs from 'fs'`, `process.env.X`, `Buffer.from(...)`, etc. and tsc accepts it. Runtime: CitizenFX V8 has no Node API surface. The bundler (`BuildManager.ts:921-942`, browser branch with `external: []`) would attempt to bundle Node modules into the IIFE, esbuild fails at build time for `import * as fs from 'fs'` (no fs polyfill in browser platform), but unprefixed Node globals like `process`/`Buffer` slip through esbuild's polyfilling and crash at runtime. **Fix:** see §1 HIGH (whitelist via `types`).

- **LOW — Direct DOM-type *usage* in client/server: none.** Plugin client code uses `console.*`, `setTimeout`, `RegisterNuiCallback`, `SendNUIMessage`, `emitNet`, `onNet`, GTA natives — all declared by `@citizenfx/client`. No `addEventListener`, no `document.querySelector`, no `fetch`. Sound discipline at the file level even though the tsconfig doesn't enforce it.

---

## 3. Node lib leakage in html/shared

### Findings

- **MEDIUM — `process.env.ASSET_SERVER_URL` accessed in NUI code.** `src/plugins/[character]/[auth]/character-create/html/utils/getClothingImage.ts:40,74,107,141`. The browser/NUI runtime has no `process` global. This typechecks because (a) `tsconfig.webview.json` has no `types` whitelist so `@types/node` is ambient, and (b) Vite `define`s `process.env.ASSET_SERVER_URL` at build time as a string literal so the runtime value is substituted. The result works in production but the type system is masking what's really happening — anyone copying this pattern and reading another `process.env.X` would silently get `undefined` at runtime (Vite only replaces `ASSET_SERVER_URL` specifically; see `vite.config.ts:13,20`). Cross-ref: 00-inventory.md §6 MEDIUM (undocumented env var). **Fix:** import an `env.ts` shim that exports `ASSET_SERVER_URL` as a typed constant, fed by Vite's `import.meta.env` (the Vite-native idiom) or by an explicit `define`. Keep `process.env` out of NUI source.

- **NONE — No `node:*` imports, no `Buffer`, no `__dirname`, no `require()`, no `child_process` usage in `**/html/**` or `**/shared/**`.** Verified by grep. Shared code (`character-create/shared/{store,types,variations.json}`) is pure data structures and a tiny store class.

- **LOW — `shared/` files are typechecked under DOM lib (webview tsconfig) — but they may be consumed by plugin server code.** `character-create/server/index.ts:3` does `import { CharacterData } from '../shared/types'`. Server-side TS at `lib: ["es2022"]` + ambient `@citizenfx/server` + ambient `@types/node` + (per webview overlap) effective DOM lib means the same .ts file is type-checked under three different lib settings depending on the project. Today `shared/types.ts` is plain interfaces and `shared/store.ts` is a small class with no platform calls — no runtime issue. But there's no guard against a future shared file using `document.*` or `Buffer.from(...)`. (Cross-ref: 01-architecture.md §3 HIGH; §4 LOW.)

---

## 4. Type-safety escape hatches

Counts (verified by grep across `src/**/*.{ts,tsx}`):

| Pattern | Count | Files |
|---|---|---|
| Bare `: any` annotations | ~38 | 13 files |
| `as any` casts | 4 | 3 files |
| `as unknown as` | 2 | `webview/theme/tailwind.config.ts` (both `CSSRuleObject` casts — benign type system limitation around tailwindcss `@types`) |
| `// @ts-ignore` / `// @ts-expect-error` / `// @ts-nocheck` | 0 | — |
| Unsafe JSON casts (`JSON.parse(...) as T`) | 4 | `FileManager.ts:154,518,532`, `ManifestManager.ts:61` (dead) |
| `as NuiCallback<...>` (type assertion on callback expressions) | 13 | `character-create/client/events.ts` |
| `as PluginManifest` / `as BasicPluginManifest` | 4 | `FileManager.ts` ×3, `ManifestManager.ts` ×1 (dead) |

Zero `@ts-ignore` is good — the project doesn't rely on directive-level escapes. But the structural escapes are concentrated in cross-trust-boundary code.

### Findings

- **HIGH — `[default]/core/server/index.ts:234` casts an HTTP query parameter to string without validation.** `const resourceName = query.resource as string`. `query.resource` comes from `url.parse(req.url || '', true).query` — its type is `string | string[] | undefined`. A request like `GET /restart?resource=a&resource=b` produces an array; `restartResource(['a','b'])` then runs `resourceName.endsWith('/core')` (line 49) on an array and `endsWith` is undefined → 500. With the placeholder API key from 00-inventory.md §6, this is a remote-controllable crash vector.  **Fix:** narrow with `typeof query.resource === 'string'`; reject otherwise.

- **HIGH — `FileManager.loadPluginManifest` casts `JSON.parse` result to `PluginManifest` without validation.** `FileManager.ts:154`: `return JSON.parse(manifestContent) as PluginManifest`. Combined with the index signature `[key: string]: any` on `PluginManifest` (Manifest.ts:66), *any* JSON object satisfies the type. Result: a `plugin.json` containing `{"name":"x","client_scripts":42}` parses, casts, builds — and `42` lands in `client_scripts` where BuildManager's `Array.isArray` check (line 1059-1077) treats it as a non-array string-form, calling `escapeLuaString(42)` → `escapeLuaString` calls `.replace` on a number → TypeError at build time. Or worse, malformed dependencies (object form, see 01-architecture.md §5) emit `'[object Object]'`. **Fix:** validate via the existing `src/utils/schema.json` (currently dead) using ajv/zod. (Cross-ref: §5 of this doc.)

- **HIGH — Same cast at `FileManager.ts:518,532` on the live-watch path.** When the user edits `plugin.json` while `pnpm dev` is running, `writeFile` re-parses and assigns to `plugin.manifest`. Same vulnerability, same fix.

- **HIGH — `FileManager.ts:164` returns `BasicPluginManifest` from a function declared `Promise<PluginManifest>`.** When `JSON.parse` fails, the fallback path returns `{ name: pluginName } as BasicPluginManifest`. The function signature lies (`Promise<PluginManifest>`), but it works because `PluginManifest`'s index signature absorbs `BasicPluginManifest` structurally. Downstream code (`generateFxManifest`) reads `manifest.fx_version`, `manifest.games`, `manifest.client_scripts` — all `undefined`, all silently filled by defaults at BuildManager.ts:1026/1031. The plugin builds with `cerulean` + `gta5` + no scripts and no error. (Cross-ref: 00-inventory.md §2 LOW.) **Fix:** make this return `Promise<PluginManifest | null>` and have callers handle the null.

- **HIGH — `NuiCallback<T> = (data: T, cb: (response: any) => void) => void` (`shared/types.ts:303`).** The response payload from client back to NUI is `any`. Combined with `client/events.ts` repeating `cb({ status: 'ok' })` 13 times, the contract is "send back something, anything." NUI sender (`fetchNui<T>(eventName, data?: unknown): Promise<T>`) is generically typed but every call site uses `.catch((error: any) => ...)` and never specifies T (e.g., `CameraControls.tsx:33` `fetchNui('character-create:zoom-camera', { direction }).catch(...)`). End-to-end: NUI sends `unknown` data, client casts callback, response is `any`, NUI receives `any`. **Fix:** define a discriminated union `NuiResponse = {status: 'ok'} | {status: 'error', error: string}` and use it as the second cb arg, plus parameterize `fetchNui` calls with explicit response types.

- **HIGH — `as NuiCallback<...>` is used to silence a real type mismatch, not to add safety.** `events.ts:83` `}) as NuiCallback<SaveCharacterData>`. The cast exists because `RegisterNuiCallback`'s `@citizenfx/client` signature is `(callbackType: string, callback: Function): void` — it accepts any function and returns nothing. The cast adds no runtime check. Worse, `events.ts:242` casts the drag-end callback to `NuiCallback<any>` — an explicit erasure. (Refactor opportunity: a typed wrapper `registerCallback<T>(type: string, handler: NuiCallback<T>)` that internally calls `RegisterNuiCallback` would centralize the cast and make every call site type-safe.)

- **MEDIUM — `getClothingImage.ts:212` casts imported JSON to a complex type.** `const typedVariationsData = variationsData as VariationsType`. `variations.json` is imported via `resolveJsonModule`, then asserted to a 4-level-nested type with explicit index signatures. No validation. Downstream code accesses `variations[componentIdStr][drawableIdStr]` and `Math.max(...drawableIds)` — if the JSON shape ever changes, the code crashes silently with `undefined` lookups. **Fix:** zod-parse at module load.

- **MEDIUM — `Page.tsx:69` `setActiveTab(tab as any)`.** `tab` is a `string` (from a button click), `setActiveTab` expects `TabType = 'model' | 'face' | 'hair' | 'appearance' | 'clothing'`. The cast bypasses the union check; if a future tab button passes `'cosmetics'`, the state is invalid and downstream `activeTab === 'face'` checks all fall through. **Fix:** restrict the click handler param to `TabType`, or runtime-validate before setting.

- **MEDIUM — `ClothingTabMain.tsx:102` `onClothingChange(key as any, value)`.** Same shape — stripping a generic to bypass a union narrowing. Unsafe.

- **MEDIUM — `character-manager.ts:357` `private applyProps(props: any)`.** `PropData` type is defined right next to it in `shared/types.ts:89-100` and even imported elsewhere. Author chose `any` instead. Means props field access (`props.hat`, `props.glasses`, etc.) inside the method has no IDE assistance and no error if a typo or missing key. **Fix:** type as `PropData`.

- **MEDIUM — `character-manager.ts:482` `let updatedCategory: any`.** Used inside `updateAppearance` to hold either an `AppearanceOverlay` or a number. Should be a discriminated branch on `typeof currentAppearance[category]` (already present at line 484), with the variable typed as `AppearanceOverlay`. **Fix:** declare `updatedCategory: AppearanceOverlay` inside the else branch.

- **LOW — `useDrag.ts:215,217` `(window as any).resetDragPrompts = ...`.** Window pollution without `declare global { interface Window { resetDragPrompts?: ... } }`. The pattern works because `as any` is a wildcard, but a future `getResetDragPrompts()` typo would silently get `undefined`. **Fix:** module-augment `Window` (analogous to what `webview/utils/fetchNui.ts:1-5` already does for `GetParentResourceName`).

- **LOW — `events.ts:242` `as NuiCallback<any>` for drag-end.** The drag-end NUI message intentionally has no payload. The right type is `NuiCallback<undefined>` or a `NuiCallback<{}>`, not `<any>`. Cosmetic, but it's the only `<any>` callback and it stands out.

- **NIT — `as unknown as CSSRuleObject` (×2) in `webview/theme/tailwind.config.ts:87,101`.** Tailwind plugin types are notoriously loose; this is a generally-accepted workaround. Not a real escape hatch — flagged for completeness only.

---

## 5. Plugin manifest typing

The schema `src/utils/schema.json` describes `plugin.json` with `required: ["name", "version", "fx_version"]`, an `enum` for `fx_version` (`cerulean`/`bodacious`/`adamant`), an `enum` for `games` (`gta5`/`rdr3`), and structured types for `data_files`, `dependencies`, `constraints`, etc.

### Findings

- **HIGH — The schema is not used at build time.** Verified by grep for `schema.json` across `src/`: zero hits in code (only mentioned in audit/01-architecture.md). `FileManager.loadPluginManifest` (line 148-171) is the sole entry point: `JSON.parse` + `as PluginManifest`, no ajv, no zod, no manual key validation. Required fields, enum constraints, type constraints — all unenforced. (Cross-ref: 01-architecture.md §4 LOW.) **Fix:** at build time, load the schema and validate every plugin.json against it. Reject (or warn loudly) on failure. The schema and the `PluginManifest` interface should be derived from one source — either generate the interface from the schema (via `json-schema-to-typescript`) or generate a zod schema and infer the type from it.

- **HIGH — Malformed manifests do not fail the build.** Three failure modes today:
  1. **Invalid JSON:** `loadPluginManifest` catches the parse error, warns, and returns `{ name: dirname } as BasicPluginManifest`. Build proceeds with a near-empty manifest, fxmanifest.lua emits with `cerulean` + `['gta5']` defaults and no scripts.
  2. **Missing required fields:** `name` actually isn't even emitted to fxmanifest.lua (per 01-architecture.md §5 HIGH); `version`/`fx_version` are silently defaulted. Schema lies.
  3. **Wrong type for a known field:** e.g., `client_scripts: 42` (number, not string|string[]). `JSON.parse + as` accepts it. BuildManager.ts:1059-1077 checks `Array.isArray(manifest.client_scripts)` (false) and falls into the else branch which calls `escapeLuaString(manifest.client_scripts)` — `escapeLuaString` does `str.replace(...)` on a non-string and crashes with `str.replace is not a function`. The build aborts at a confusing place. **Fix:** validate before any field access.

- **HIGH — Extra fields land as garbage Lua.** Already covered in 01-architecture.md §5 HIGH (`config` dropped, `lua54: true` emits `lua54 'true'`, `experimental: {...}` emits `experimental '[object Object]'`). The type-safety angle: the `PluginManifest` index signature `[key: string]: any` (Manifest.ts:66) is what *enables* arbitrary fields to be accepted in the first place. Even when the schema says `additionalProperties: false` (or could), the TS type erases that constraint. **Fix:** either remove the index signature (force every field through the typed list, generated from the schema) or treat unknown fields as a runtime warning.

- **MEDIUM — `BasicPluginManifest` vs `PluginManifest` is a leaky abstraction.** `BasicPluginManifest` is structurally a *subset* of `PluginManifest` (its keys are all optional in the parent), so casting one to the other passes structurally. The cast at `FileManager.ts:164` (`{ name: pluginName } as BasicPluginManifest`) returned from a function declared `Promise<PluginManifest>` is therefore tolerated — but it hides which manifest level was actually loaded. Downstream code accesses `manifest.fx_version` etc. without checking if it's a real manifest. **Fix:** make the function return type explicit (`Promise<PluginManifest | null>`) and have callers branch.

- **LOW — Plugin manifest hand-maintained interface drifts from the schema.** Examples (verified):
  - Schema requires `["name", "version", "fx_version"]`; the TS interface marks `version` and `fx_version` optional.
  - Schema declares `lua54`, `experimental`, `convars`, `custom_data` (per 01-architecture.md §5 audit table); the TS interface declares none of them — they fall under the `[key: string]: any` index signature.
  - Schema's `dependencies` items can be `string | {name, server}`; the TS interface declares `dependencies?: string[]` (string-only). (Cross-ref: 01-architecture.md §5 HIGH.) The TS layer can't even *represent* the legal object form. **Fix:** generate the interface from the schema.

---

## 6. NUI ↔ client and client ↔ server message types

### NUI ↔ client

Fixed-string action names flow in two directions:

| Direction | Sender | Receiver | Routing key |
|---|---|---|---|
| client → NUI | `SendNUIMessage({action: NUI_EVENT, ...})` (`client/ui.ts:40`) | `useNuiEvent(NUI_EVENT, ...)` (`html/Page.tsx:34`) | `NUI_EVENT` constant exported from `shared/types.ts:7` ✓ |
| NUI → client | `fetchNui('character-create:zoom-camera', ...)` (`html/components/CameraControls.tsx:33`) | `RegisterNuiCallback('character-create:zoom-camera', ...)` (`client/events.ts:164`) | string literal duplicated in both files |

The 12 `RegisterNuiCallback` action strings in `events.ts` and the corresponding `fetchNui(...)` call sites are paired by literal string match. There is no shared registry, no enum, no compile-time check that the names match. Misspelling on either side fails silently at runtime.

### Findings

- **HIGH — No central registry for NUI action strings, except `NUI_EVENT` (one of 13).** Only the toggle-UI message gets a shared constant. The other 12 are duplicated string literals: `'character-create:update-model'`, `'character-create:update-face'`, `'character-create:update-hair'`, `'character-create:update-appearance'`, `'character-create:update-clothing'`, `'character-create:rotate-camera'`, `'character-create:zoom-camera'`, `'character-create:focus-camera'`, `'character-create:rotate-player'`, `'character-create:drag-camera'`, `'character-create:drag-end'`, `'character-create:save'` (also used as a NetEvent name to server). Adding a 14th action requires editing two files and hoping the strings match. **Fix:** export a single union of action names from `shared/types.ts` (e.g., `export const NUI_ACTIONS = {...} as const` and `type NuiAction = typeof NUI_ACTIONS[keyof typeof NUI_ACTIONS]`); have both `fetchNui<TReq, TResp>(action: NuiAction, ...)` and a typed wrapper around `RegisterNuiCallback` accept only that union.

- **HIGH — No discriminated union mapping action → payload type.** Even where the action name is a constant, the payload type isn't bound to it. Each `RegisterNuiCallback` re-declares the data type explicitly (e.g., `(data: ModelUpdateData, cb: (data: any) => void)`). Nothing ties the action string `'character-create:update-model'` to the payload type `ModelUpdateData`. A future caller of `fetchNui('character-create:update-model', { model: 'x' })` could pass `{ name: 'x' }` — payload is `unknown` from `fetchNui`'s signature so tsc accepts it. **Fix:** define `interface NuiCallbackMap { 'character-create:update-model': { request: ModelUpdateData; response: NuiResponse }; ... }` and key both sender (`fetchNui<K extends keyof NuiCallbackMap>(action: K, data: NuiCallbackMap[K]['request']): Promise<NuiCallbackMap[K]['response']>`) and receiver off it.

- **HIGH — `cb: (data: any) => void` everywhere.** Already noted in §4 HIGH on `NuiCallback<T>`'s second param being `any`. The 12 callbacks all return `cb({ status: 'ok' })` literally; nothing asserts that shape. **Fix:** typed response (see §4).

- **MEDIUM — `useNuiEvent` exposes `NuiEventData<T = unknown> = { action: string } & T` but the only call site uses `(data: any)` (Page.tsx:34).** The hook is generic; the consumer skips the generic. The action is `NUI_EVENT` (the toggle), so `data` is the boolean visibility — `useNuiEvent<{action: typeof NUI_EVENT, data: boolean}>(...)` would type it correctly. **Fix:** Page.tsx:34 — drop the `any`, write a proper generic.

### Client ↔ server (NetEvents)

| Direction | Sender | Receiver | Payload type |
|---|---|---|---|
| client → server | `emitNet('character-create:save', data.characterData)` (`client/events.ts:78`) | `onNet('character-create:save', this.handleSaveCharacter.bind(this))` (`server/index.ts:26`) | `CharacterData` on both sides via `shared/types.ts` |
| server → client | `emitNet('character-create:save-result', source, {...})` (`server/index.ts:50,53`) | `onNet('character-create:save-result', (result: ...) => ...)` (`client/events.ts:251`) | inline structural type `{success: boolean; error?: string}` on receiver, untyped on sender |

### Findings

- **HIGH — `onNet` callback payloads typecheck against developer-declared types but are not validated at the trust boundary.** `server/index.ts:33` `private handleSaveCharacter(characterData: CharacterData)` — TypeScript believes `characterData: CharacterData`. At runtime, FiveM's net event passes whatever the *client* sent, including a malicious modified client. A client sending `null`, `[]`, or `{ model: 'x' }` (missing every nested field) crashes when `applyFullCharacterData` reads `characterData.face.fatherIndex`. The server is the trust boundary; payload validation is mandatory there. (Audit/00-inventory.md and 01-architecture.md noted the auth-key gap; this is the symmetrical gap on the data-shape side.) **Fix:** zod/typebox/manual validate every `onNet` payload at the boundary.

- **HIGH — NetEvent name strings duplicated, paired by literal match.** `'character-create:save'`, `'character-create:save-result'` are typed as plain string arguments to `emitNet`/`onNet`. No shared constant, no compile-time check. Same fix shape as the NUI registry.

- **MEDIUM — Server → client payload `{ success: boolean; error?: string }` is declared inline at the receiver but not at the sender.** `server/index.ts:50` writes `emitNet(..., source, { success: true })`; `server/index.ts:53` writes `emitNet(..., source, { success: false, error: ... })`. The client (`events.ts:253`) declares the shape inline as `(result: { success: boolean; error?: string }) => ...`. If the server adds a new field (`code: number`), the client's local type lags. **Fix:** export `interface SaveCharacterResult` from `shared/types.ts` and use it on both sides.

- **MEDIUM — Other plugins have no NetEvents at all (zero-byte server/client files in `character-select` and `character-edit`).** Verified: `wc -l` reports `0` for `[character]/[auth]/character-select/server/index.ts`, `[character]/character-edit/server/index.ts`, and the matching `client/index.ts` files. The empty stubs still get bundled (per 01-architecture.md §3 HIGH on the per-file walker). No type-safety risk per se — flagged because any future implementation will inherit the same untyped-NetEvent pattern. **Fix:** when these plugins are filled in, route NetEvents through the same shared map as NUI events.

---

## 7. esbuild externals

### Findings

- **HIGH (interaction with §1 typeRoots) — Server bundles externalize bare-name Node modules only; `node:fs` etc. would be bundled.** `BuildManager.getExternalPackages` (line 921-942) returns `['http','https','url','fs','path','os','crypto','buffer','stream','util','events','zlib','net','tls','dns','child_process']` for server. Missing: `worker_threads`, `perf_hooks`, `assert`, `process`, `module`, `cluster`, `vm`, `v8`, `inspector`, `repl`, `readline`, `dgram`, `string_decoder`, `timers`, `fs/promises` literal subpath, `node:*`-prefixed forms of all of the above. With `@types/node` ambient (per §1), tsc accepts `import * as fs from 'node:fs'` and esbuild then attempts to bundle it (failing with "Could not resolve 'node:fs'" on browser platform; possibly also on node platform with this externals list). Cross-ref: 00-inventory.md §2 MEDIUM. **Fix:** `external: [/^node:/, ...require('module').builtinModules]`.

- **HIGH — Browser bundles externalize nothing — but the path-walker emits browser bundles for things that should not be browser-bundled.** Externals list `[]` for browser (correct in spirit; browser builds want everything inlined). But every loose `.ts` file under a plugin that doesn't contain `/server/` is bundled as an IIFE on the browser platform — including `shared/store.ts`, `shared/types.ts`, and any html/utils files. Per 01-architecture.md §3 HIGH, this also produces an isolated browser-IIFE for `shared/types.ts` even when nothing in the plugin would need that as a runtime entry — only as an import. The type system (via the webview tsconfig including shared) thinks shared code is browser-targeted; the bundler agrees and emits redundant artifacts. There's no contradiction here, just compounded waste, and a typing-vs-bundling drift if shared ever needs Node-only types. **Fix:** drive bundling from manifest-declared entry points (mentioned in 01-architecture.md §3); typecheck shared under both libs only as a safety net.

- **MEDIUM — `canvas` is the only browser-side external, and only for server.** `BuildManager.ts:359` `external: externalPackages.concat(isServerScript ? ['canvas'] : [])`. Hardcoded list. Reasoning is implicit (server-side image processing? `image-js` peer dep? — both unimported per 00-inventory.md §4). The point relevant to type safety: there's no `peerDependencies`-style declaration in `plugin.json` for what each plugin externalizes. A plugin that adds `sharp` or a different native gets either silently bundled (and crashes) or has to add to this hardcoded list. **Fix:** read externals from `plugin.json` (e.g., a custom `externals` key) — would also flow naturally into the manifest validation in §5.

- **LOW — `target: 'es2017'` on esbuild (`BuildManager.ts:354`) but `target: 'es2022'` on tsconfig.plugins (line 6).** Plugin TS code is type-checked at ES2022 (`Object.hasOwn`, `Error.cause`, etc. allowed) but transpiled to ES2017. If a plugin author uses an ES2022 feature, tsc accepts it and esbuild downlevels it (most ES2022 features have transforms, but private class fields, top-level await, etc. don't survive ES2017 cleanly). **Fix:** unify the target — `es2020` or `es2022` (CitizenFX V8 supports modern ES).

---

## 8. Generic any-leakage in managers

### Findings

- **HIGH — `PluginReloadManager.makeRequest` returns `Promise<any>`.** `PluginReloadManager.ts:218-275`: HTTP response body is `JSON.parse(data)` and resolved as `any`. Three callers immediately read fields:
  - `getResources()` (line 113-125) reads `response.resources || []` and returns `string[]`. If the server returns `{success: false, error: '...'}` (any 2xx error response), `response.resources` is `undefined`, return is `[]`, and `initialize()` (line 84-107) considers the connection "successful." No error is surfaced.
  - `reloadResource(name)` (line 131-167) reads `response.success`, `response.message`, builds a `ReloadResult`. If the server returns invalid JSON, `JSON.parse` rejects in `makeRequest` and the catch handler at line 153-167 runs — fine. If the server returns valid JSON but missing `success`, the result has `success: undefined` which equals `false` in `if (response.success)` checks but is `undefined` in the returned object. Watcher logs "✓ Reloaded plugin" or "✗ Failed" but the operator can't tell which.
  - `reloadAllResources()` (line 181-209) — same.
  
  All three callers trust `any` without narrowing. **Fix:** make `makeRequest` generic (`makeRequest<T>(...)`) with a runtime validator (zod) per response shape, or at minimum return `Promise<unknown>` and force callers to narrow.

- **HIGH — `FileManager.loadPluginManifest`'s declared return type lies (see §5).** `Promise<PluginManifest>` includes the fallback path returning `{name}`. Callers in `BuildManager.generateFxManifest` access `manifest.dependencies`, `manifest.client_scripts`, `manifest.fx_version`, etc. — all `undefined` on the fallback path, mostly tolerated by `if`-guards but with default-substitution muddying which manifest came in. **Fix:** see §5.

- **HIGH — `BuildManager.getCustomProperties` returns `Record<string, any>`.** `BuildManager.ts:1302-1336`. Callers at line 1264-1276 iterate `Object.entries`, branch on `Array.isArray(value)`, otherwise `String(value)`. The `any` is fine *for the iteration* (string-coercion is total), but it's the symptom of the upstream `[key: string]: any` on `PluginManifest` (Manifest.ts:66). The type system doesn't know what's legal in a manifest, so it can't help here. (Cross-ref: 01-architecture.md §5 HIGH on `'[object Object]'` emission.) **Fix:** typed manifest → typed custom-property map → `escapeLuaValue(value: string | number | boolean)` with a refusal for objects. Same fix as 01-architecture §5.

- **MEDIUM — `FileManager.scanPlugins` swallows manifest errors and continues** (`FileManager.ts:115-121`). The plugin gets registered without `plugin.manifest` populated. Downstream code reads `plugin.manifest!` (or with optional chaining, depending on path), creating runtime `undefined` access. Not strictly a typing escape — `Plugin.manifest` is correctly typed `manifest?: PluginManifest` — but the BuildManager's many `manifest.X` accesses assume non-undefined. **Fix:** treat manifest-load failures as fatal for that plugin (skip from the build set entirely), or branch every BuildManager step on `if (!plugin.manifest) return`.

- **LOW — `ManifestManager.ts` and `PluginManager.ts` are dead code with `as PluginManifest` casts of their own (e.g., ManifestManager.ts:61).** They drift from the live FileManager logic, but since they're never imported (00-inventory.md §2 HIGH), they don't affect runtime. Listed here only to avoid the next reader assuming they're authoritative for manifest types. **Fix:** delete (per 00-inventory.md §2).

- **LOW — `PluginBuilder` (build.ts) and BuildManager both implement `findPluginForPath` and the `initialized` guard pattern with three different log levels** (cross-ref: 01-architecture.md §7 LOW + MEDIUM). Type-safety angle: `BuildManager.reloadPlugin` (line 81-119) accepts `string | Plugin` and passes to `PluginReloadManager.reloadPlugin`, which also accepts `string | Plugin` and re-narrows. Two unions, two narrows; no risk per se but more surface to keep in sync.

---

## Top 5 risks

1. **HIGH — `tsconfig.plugins.json` exposes both `@citizenfx/client` and `@citizenfx/server` ambient to all plugin code** (§1, §2). Server natives (`StopResource`, `StartResource`) typecheck inside client scripts; client-only NUI calls typecheck inside server scripts. The path-based bundler routes correctly but tsc has no clue. Compounded by `@types/node` being ambient on the same path. The fix is `"types": [...]` in each tsconfig, or a client/server tsconfig split.
2. **HIGH — `tsconfig.webview.json` lets `@types/node` go ambient in NUI/browser code** (§1, §3). `process.env.X` typechecks in `getClothingImage.ts` because of this; only Vite's `define` rescues it at runtime. Any future `Buffer.from(...)` or `process.cwd()` would compile and crash.
3. **HIGH — `plugin.json` is parsed and cast to `PluginManifest` with no validation against the existing `src/utils/schema.json`** (§4, §5). Combined with `[key: string]: any` on the interface and a JSON-parse-failure fallback returning `{name}`, malformed manifests build successfully and emit garbage Lua (`'[object Object]'`, `lua54 'true'`-as-string, etc.), or crash inside `escapeLuaString` when a field's type is wrong. The schema exists; nothing reads it.
4. **HIGH — NUI/NetEvent contracts are pure-string with no shared registry, and payloads are untyped at the trust boundary** (§4, §6). 12 NUI action strings duplicated between sender and receiver, 2 NetEvent strings between client and server, response payloads typed `any`, server's `onNet` handler trusts client-provided `CharacterData` without any runtime check. A typo or malicious payload crashes the receiver.
5. **HIGH — `PluginReloadManager.makeRequest` returns `Promise<any>` and three callers read fields without narrowing** (§8). The watcher reports "✓ Reloaded" on responses missing `success`; `initialize()` succeeds on error responses that happened to be HTTP 2xx. Combined with 01-architecture.md §6 (HTTP `200 OK` does not imply restart success), the entire reload signal-path lacks both runtime narrowing and end-to-end correctness.

---

## Open questions for later prompts

- **P3/Plugin loading:** does esbuild actually fail on `import 'node:fs'` from a server-platform bundle given the externals list? `[UNVERIFIED]` — would need a test plugin importing the node:-prefixed form.
- **P3/Plugin loading:** does `tsc -b` from the root currently succeed despite `tsconfig.scripts.json` lacking `composite: true`? `[UNVERIFIED]` — would need to actually run it. The team uses `tsx` and may never have noticed.
- **P3/Type narrowing:** if `tsconfig.plugins.json` is split into client/server tsconfigs with disjoint `types` lists, do the existing `/// <reference types="@citizenfx/{client,server}" />` directives still work, or do they conflict with `types: []`? `[UNVERIFIED]` — TypeScript docs say `types: []` opts out of automatic inclusion but still allows triple-slash references; needs a test.
- **P4/Schema generation:** can `json-schema-to-typescript` consume `src/utils/schema.json` and produce a `PluginManifest` interface that exactly matches what `BuildManager.generateFxManifest` reads? The current handwritten interface diverges from the schema (e.g., `dependencies` items as objects — 01-architecture.md §5 HIGH). `[UNVERIFIED]`.
- **P4/Runtime validation:** is the cost of zod-validating every `plugin.json` (4 plugins today, possibly 50+ in production) at startup acceptable for the watcher loop? `[UNVERIFIED]`.
