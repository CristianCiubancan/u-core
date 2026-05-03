# qb-core port audit — final report

Function-by-function audit of `src/plugins/[default]/qb-core/` against
`tmp/qb-core-upstream/` (qbcore-framework/qb-core HEAD as of 2026-05-03).
Methodology: 10 parallel Explore-agent reads producing structured
findings, then per-finding verification by reading actual code on both
sides before fixing.

## Result tally

- **16 real bugs fixed** (5 found & fixed pre-audit, 11 found by audit)
- **6 agent false positives** (verified by reading code, no fix needed)
- **1 conscious divergence kept** (`Kick` retry loop semantics — our version is more sensible)
- **2 known limitations remain unfixed** (NUI assets for DrawText; vehicle-properties full coverage)

Verification rate: ~58% of agent findings were real bugs; ~32% were
misreads of the port. Lesson: agent audit reports must be verified
against actual code before action.

---

## Pre-audit fixes (server/functions.ts)

| Function | Issue | Fix |
|---|---|---|
| `getPlayers()` (internal) | called `globalThis.GetPlayers()` (Lua-only helper) → runtime TypeError on every connect | Removed wrapper, call sites use FXServer-Node `getPlayers()` global directly |
| `GetClosestObject` | missing | Ported |
| `GetClosestVehicle` | missing | Ported |
| `GetClosestPed` | missing | Ported |
| `CreateAutomobile` | missing | Ported (legacy CREATE_AUTOMOBILE native via Citizen.invokeNative) |
| `PaycheckInterval` (internal) | missing | Ported — recurring timer pays online players every Config.Money.PayCheckTimeOut minutes |

## Audit-found fixes

### server

| File | Function | Issue | Status |
|---|---|---|---|
| functions.ts | `CreateUseableItem` | Stored callback under `cb` key; upstream uses `func` → broke qb-inventory | 🔧 Renamed to `func` |
| functions.ts | `TriggerClientCallback` | Forced `cb` to be required; upstream allows promise-await mode | 🔧 Made `cb` optional, returns Promise when omitted |
| events.ts | playerConnecting | Hardcoded join message bypassed Lang | 🔧 Routed through `Lang.t('info.join_server')` |
| events.ts | deprecated UseItem stub | Lost upstream's `QBCore.Debug(item)` call | 🔧 Restored, plus "with the following data" message text |
| events.ts | response handler | Resolved promise wasn't wired for TriggerClientCallback await mode | 🔧 Added `cb.promise?.resolve?.(...)` call |
| debug.ts | tPrint | Wrong ANSI codes for function (`\x1b[39m` → `\x1b[37m`) and number (`\x1b[35m` → `\x1b[36m`) | 🔧 Fixed |

### client

| Function | Issue | Status |
|---|---|---|
| `GetCurrentTime` | Field renames (`min`→`minute`, `ampm`→`period`) and shape changes broke every caller | 🔧 Restored upstream field names + conditional-set shape |
| `GetGroundHash` | Used `StartShapeTestRay` instead of `StartShapeTestCapsule`; returned single value instead of upstream's 6-tuple | 🔧 Switched native + return tuple |
| `GetCardinalDirection` | Returned `''` instead of `'Cardinal Direction Error'` on invalid entity; missing PlayerPedId fallback | 🔧 Match upstream both branches |
| `SpawnClear` | Stricter than upstream (also rejected ped-occupied spots); missing PlayerPedId fallback | 🔧 Vehicles-only + fallback |
| `GetClosestBone`, `GetBoneDistance`, `AttachProp` | Missing | 🔧 Ported |
| `StartParticleAtCoord`, `StartParticleOnEntity` | Missing | 🔧 Ported |

### shared

| Item | Issue | Status |
|---|---|---|
| `IsFunction(value)` | Missing | 🔧 Added to shared/main.ts |
| `ChangeVehicleExtra(vehicle, extra, enable)` | Missing (client-only — needs natives) | 🔧 Added to client Shared |
| `SetDefaultVehicleExtras(vehicle, config)` | Missing (client-only) | 🔧 Added to client Shared |
| `GetShared(namespace, item)` | Missing top-level export | 🔧 Registered on both server/index.ts and client/index.ts |

## False positives (verified by code reading)

| # | Claim | Reality |
|---|---|---|
| 25 | client TriggerCallback promise never resolves | `client/events.ts:241` calls `cb.promise?.resolve(...)` correctly. Agent didn't read the handler. |
| 27 | RemoveMoney DontAllowMinus/MinusLimit order reversed | Port logic identical to upstream — DontAllowMinus loop runs first (lines 697-701), MinusLimit check after (line 702). |
| 28 | tp command sends wrong shape | Server sends `{x,y,z}` object; client/events.ts:38 expects `{x,y,z}`. Internally consistent. Upstream's vec3 serializes to same shape over wire. |
| 29 | AddJobs/Items/Gangs don't fail-fast | Port returns mid-loop on first failure — same fail-fast as upstream's `break`. |
| 30 | PlayerDefaults missing | Ported, just lives in player.ts (lines 195-264) instead of config.ts because lazy factories reference QBCore.Player.* methods that don't exist at config-load time. |
| 39 | GetCoreVersion logging branch inverted | JS empty-string is falsy, so `if (invokingResource)` is equivalent to upstream's `if x and x ~= ''`. |

## Conscious divergences (kept, documented)

### `Kick` retry loop (server/functions.ts)

Upstream's retry semantics read as buggy: `if ping >= 0 then break`
(give up while connected) and re-spawns DropPlayer threads when
`ping < 0` (already gone). Our port has the inverted (more sensible)
semantics: keep dropping while connected, break when gone. Same end
result for the common case; under unstable connections our version
retries when it actually matters. Decision validated 2026-05-03.

Documented inline as `// u-core divergence from upstream Kick:`.

### `playerDropped` fires `OnPlayerUnload` (server/events.ts)

Upstream's `playerDropped` does Save+map-clear but never fires the
`QBCore:Server:OnPlayerUnload` event, leaking per-player state in any
plugin that hooks the unload event for cleanup. Our port also fires
the unload event on hard disconnects. Already documented.

## Known limitations remaining

| Limitation | Cost to close |
|---|---|
| NUI assets for DrawText not ported (`html/` directory). DrawText is a no-op silently. Affects qb-target hover prompts, qb-policejob MDT. | ~30 min: copy upstream html/ verbatim, declare `ui_page` + `files` in plugin.json |
| `GetVehicleProperties`/`SetVehicleProperties` cover core fields only (~75 mod slots / livery / headlightColor / tyreSmokeColor / neon channels missing). Garages save vehicles but lose customizations on respawn. | ~2 hrs: mechanical native plumbing |
| Locale system ships only `en`. Non-English players see English notify chrome. Other 47 upstream locale files not converted. | ~5 min/locale × N locales we want |

## Files audited

✅ server/functions.lua  ✅ server/player.lua  ✅ server/events.lua
✅ server/commands.lua  ✅ server/exports.lua  ✅ server/debug.lua
✅ server/main.lua → server/index.ts  ✅ client/functions.lua
✅ client/events.lua  ✅ client/loops.lua  ✅ client/drawtext.lua
✅ client/main.lua → client/index.ts  ✅ shared/main.lua
✅ shared/locale.lua  ✅ config.lua

Pure-data shared files (items.lua, vehicles.lua, weapons.lua, jobs.lua,
gangs.lua, locations.lua) generated by `scripts/port-qb-shared.mjs`,
re-runnable when upstream data churns. Not function-by-function audited.
