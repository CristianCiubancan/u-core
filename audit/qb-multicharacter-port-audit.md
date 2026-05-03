# qb-multicharacter port audit

Manual function-by-function comparison against
`tmp/qb-multicharacter-upstream/`. NO agent shortcuts — every entry
below is verified by reading both files in full and walking branches.

---

## Findings

### 🔧 Real divergences — FIXED

#### 1. ~~`createCharacter` doesn't gate on `Apartments.Starting`~~ — FIXED

Implemented option A: at qb-multicharacter server boot,
`readApartmentsStarting()` reads `qb-apartments/config.lua` via
`LoadResourceFile`, strips Lua comments, regex-matches
`Apartments.Starting = (true|false)`, caches the boolean. Defaults to
`true` (matches stock qb-apartments config) when the file is missing
or unparseable. `createCharacter` now gates on
`GetResourceState('qb-apartments') === 'started' && APARTMENTS_STARTING`
— matching upstream's two-part gate exactly.

**Original divergence text follows for reference:**

- **Upstream** `server/main.lua:122`:
  ```lua
  if GetResourceState('qb-apartments') == 'started' and Apartments.Starting then
  ```
- **Port** `server/index.ts:282`:
  ```ts
  if (GetResourceState('qb-apartments') === 'started') {
  ```

`Apartments.Starting` is a Lua global set by qb-apartments' shared script. Server admins who set it to `false` (intentional opt-out — wanting new chars to skip apartment selection and spawn directly via DefaultSpawn) get DIFFERENT behavior:
- Upstream: routes through `closeNUIdefault` → no apartment selection
- Port: still routes through `apartments:client:setupSpawnUI` → forces apartment selection

Our TS bundle can't access qb-apartments' Lua-global directly. **Decision needed** — fix options at the bottom of this doc.

---

### ⚠️ Kept u-core divergences (documented bug-fixes)

#### 2. `_firstSpawn: true` in `createCharacter` newData

- **Upstream**: `newData = {cid = data.cid, charinfo = data}` only
- **Port**: adds `_firstSpawn: true`

Closes upstream Last-Location bug — new chars picking "Last Location" in qb-spawn would teleport into the character-creation interior. Confirmed kept by user.

#### 3. `waitForPreloading(src)` has 10s timeout

- **Upstream**: `repeat Wait(10) until hasDonePreloading[src]` (infinite)
- **Port**: `await waitForPreloading(src)` with 10s ceiling

Defensive — covers the case where `QBCore:Server:PlayerLoaded` never fires. Documented in `project_known_issues` memory.

#### 4. `closeUI` NUI callback fixes upstream nil-access bug

- **Upstream** `client/main.lua:173-187`:
  ```lua
  RegisterNUICallback('closeUI', function(_, cb)
      local cData = data.cData  -- !! `data` is nil — `_` is the param name
      ...
  ```
  Upstream uses `_` as the data param name, then references global `data` which doesn't exist. Runtime nil-access error.
- **Port** `client/index.ts:293-308`: signature is `(data: { cData?: any }, cb)`. Optional-chains `data?.cData` and only emits `loadUserData` if cData is present.

Port is functionally correct; upstream errors on this code path.

#### 5. `disconnect` handler drop reason

- **Upstream** `server/main.lua:86`: `DropPlayer(src, Lang:t('commands.droppedplayer'))` — references key under wrong namespace (`commands.` vs actual `misc.droppedplayer`). Lang.t falls through and returns the literal string `'commands.droppedplayer'` — that's what the user sees as the drop reason.
- **Port** `server/index.ts:209`: `DropPlayer(String(src), 'You have disconnected from QBCore')` — uses the actual intended text from `misc.droppedplayer`.

Port shows the user-friendly message; upstream shows broken key string.

---

### ⚙️ Port-required (React UI lifecycle)

These exist because the React UI doesn't auto-unmount the way upstream's Vue did. They're NOT behavior-on-the-wire divergences — the contract surface (event names, payload keys consumers depend on) matches upstream.

#### 6. Server `loadUserData` emits `closeNUI` before apartments/spawn handoff
`server/index.ts:239` — extra `emitNet('qb-multicharacter:client:closeNUI', src)` in the SkipSelection=false path. Upstream doesn't. Without it our React UI overlays qb-spawn.

#### 7. Client `closeNUI` handler sends extra hide message
`client/index.ts:211` — extra `SendNUIMessage({action: 'ui', toggle: false})`. Same React-doesn't-auto-unmount reason.

#### 8. Client `openCharMenu` NUI message: `locale` instead of `translations`
- **Upstream**: builds `translations` Lua table from `Lang.fallback.phrases`, sends to NUI
- **Port**: sends `locale: GetConvar('qb_locale', 'en')` for i18next to switch

Architectural difference (i18next bundles vs Lua-rendered table). Same effective UX (UI shows in correct language), different mechanism.

#### 9. Client `createNewCharacter` NUI callback adds teardown + receives 0/1 gender
- **Port** adds `openCharMenu(false) + destroyPed()` before `emitNet createCharacter`
- React UI sends gender as 0/1 directly (port doesn't translate "Male"/"Female" strings; upstream does because Vue's bound to the localized string)

UI architectural difference; functional impact is "same gender stored, no teardown race".

---

### 📝 Cosmetic / minor text

- `deletechar` command arg name: port `'citizenid'` lowercase vs upstream `Lang:t('commands.citizenid')` → "Citizen ID". Display-only divergence in chat suggestion text.
- 3 hardcoded English notify strings (`Character deleted!`, `You successfully deleted the character with citizen id <X>.`, the disconnect msg) match upstream's `en.lua` text 1:1 for the default English locale. For non-English locales the port doesn't translate (upstream does via Lang.t). Pre-existing cross-port localization gap (would need to port qb-multi's own Locale infrastructure, same scope as the qb-core locale port).

---

### ✅ Verified equivalent (read both, walked branches, matches)

#### Server
- `giveStarterItems` — same iteration, same `info` field population for id_card / driver_license, identical AddItem args
- `loadHouseData` — same SQL `SELECT * FROM houselocations`, same Houses + HouseGarages object construction (coords decoded, owned bool from int, garage decoded with `{}` fallback, decorations:[]), same emit targets `qb-garages:client:houseGarageConfig` + `qb-houses:client:setHouseConfig`
- `deleteCharacter` net handler — `Config.EnableDeleteButton` guard, `Player.DeleteCharacter` call, notify ✓
- `setupCharacters` callback — SQL `SELECT * FROM players WHERE license = ?`, JSON-decode charinfo+money+job, return ✓
- `GetUserCharacters` callback — same SQL, raw rows ✓
- `GetServerLogs` callback — same SQL ✓
- `GetNumberOfCharacters` callback — same logic (start with default → match license → override). Walked the empty-array edge case (upstream's `else numOfChars = DefaultNumberOfCharacters` outside the loop matches our default-init). ✓
- `getSkin` callback — same SQL `SELECT * FROM playerskins WHERE citizenid = ? AND active = ?` with `[cid, 1]` params, same result extraction ✓
- `logout` / `closeNUI` commands — same emit targets, same permission tiers ✓
- `QBCore:Server:PlayerLoaded` hook — `Wait(1000)` → `hasDonePreloading[src] = true` ✓
- `QBCore:Server:OnPlayerUnload` hook — `hasDonePreloading[src] = false` ✓

#### Client
- `skyCam` — exact same DoScreenFadeIn(1000) → SetTimecycleModifier('hud_def_blur') → SetTimecycleModifierStrength(1.0) → FreezeEntityPosition(false) → CreateCamWithParams (CamCoords + 60 FOV) → SetCamActive(true) → RenderScriptCams(true, false, 1, true, true). Else: SetTimecycleModifier('default') → cam teardown → RenderScriptCams(false). ✓
- `chooseChar` — SetNuiFocus(false) → DoScreenFadeOut(10) → Wait(1000) → GetInteriorAtCoords(z-18.9) → LoadInterior → IsInteriorReady wait → FreezeEntityPosition(true) → SetEntityCoords(HiddenCoords) → Wait(1500) → ShutdownLoadingScreen → ShutdownLoadingScreenNui → openCharMenu(true). ✓
- `closeNUIdefault` — DeleteEntity → SetNuiFocus(false) → DoScreenFadeOut(500) → Wait(2000) → SetEntityCoords(DefaultSpawn) → 4 events (OnPlayerLoaded server+client, SetInsideMeta houses+apartments) → Wait(500) → openCharMenu(false) → SetEntityVisible(true) → Wait(500) → DoScreenFadeIn(250) → 2 events (weathersync EnableSync, clothes CreateFirstCharacter). Step-for-step match. ✓
- `spawnLastLocation` — restored to upstream-faithful (apartments callback wraps the entire spawn flow per upstream's `if result then`). ✓
- `selectCharacter` NUI cb ✓
- `removeCharacter` NUI cb ✓
- `disconnectButton` NUI cb ✓
- `setupCharacters` NUI cb ✓
- `removeBlur` NUI cb ✓
- `cDataPed` NUI cb (port adds gender-hint logic for empty slots — UX enhancement, not a control-flow divergence)

---

## Summary table

| Bucket | Count |
|---|---|
| 🔧 Fixed in this audit pass | 1 |
| ⚠️ Kept u-core bug-fixes | 4 |
| ⚙️ Port-required for React UI | 4 |
| 📝 Cosmetic / text | 2 |
| ✅ Verified equivalent | 21 |

**Total functions audited: 32. Real behavioral divergences remaining: 0.**

Everything is either upstream-equivalent, a fixed-in-port upstream bug, or a documented architectural divergence required for the React UI lifecycle.
