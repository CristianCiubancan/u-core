# bugs.md

Audit findings from comparing our ported plugins (`src/plugins/[default]/qb-core`, `src/plugins/[qb]/qb-multicharacter`, `src/plugins/[qb]/qb-spawn`) against their upstream counterparts (`tmp/qb-core-upstream`, `tmp/qb-multicharacter-upstream`, `tmp/qb-spawn-upstream`).

Scope: the new-character vs existing-character login flow and the spawn handoff that follows. qb-core lifecycle (`Player.CreatePlayer` → `Player.Save` → `QBCore:Server:PlayerLoaded`) was verified to match upstream and is not listed.

---

## Tier 1 — bugs to fix

### 1. qb-spawn dual-register doubles handlers — ✅ FIXED

**Location (was):** `src/plugins/[qb]/qb-spawn/client/index.ts:140-146` (`dualEvent` helper), used at lines 148 and 212.

**Symptom:** every `qb-spawn:client:openUI` and `qb-spawn:client:setupSpawns` trigger fired its handler twice. Mostly invisible because the handlers are roughly idempotent (focus the NUI, send a NUI message, set a cam) but it's incorrect and wastes work — every fade/cam interp ran twice; `setDisplay` flipped twice. State-mutating logic added to these handlers later would have broken subtly.

**Cause:** verified directly against the CFX V8 runtime source at `fivem-binaries/citizen/scripting/v8/main.js:243-265`. Both `on` and `onNet` register the callback on the **same** shared `EventEmitter2`. The only difference is whether the event name is added to `netSafeEventNames` (which gates incoming net events but not local `TriggerEvent` calls). So `onNet` is a strict superset of `on` for handler firing, and dual-register attaches the same callback to the emitter twice → every trigger double-fires.

The old inline comment asserted "`onNet` is net-only" — that was wrong. The original "spawn UI never appears after createCharacter" symptom that motivated commit `e55c7a06` was almost certainly the V8 race: qb-spawn's `client/index.ts:21` does `const QBCore = (exports as any)['qb-core'].GetCoreObject()` at module top level, which throws and aborts the script before any handler registers if qb-core's V8 hasn't finished booting. That class of bug is now fixed by the `shared/compat.lua` load-order shield in qb-core. Adding the dual-register required restarting qb-spawn, and the *restart* is what fixed the symptom — not the second registration.

**Fix:** removed the `dualEvent` helper and replaced its two call sites with bare `onNet(...)`. Same approach as the `qb-core/client/events.ts` revert earlier in this debugging session.

**References:** `MEMORY.md` → `project_onnet_vs_on_dual_register.md` (corrected analysis with V8 runtime source citation).

### 2. Hardcoded English in qb-multicharacter delete-character notifies — ✅ FIXED

**Locations:**
- `src/plugins/[qb]/qb-multicharacter/server/index.ts:350` — `'Character deleted!'` (hardcoded)
- `src/plugins/[qb]/qb-multicharacter/server/index.ts:217-228` — admin `deletechar` command notifies (`'You successfully deleted the character with citizen id ${args[0]}.'` and `'You forgot to input a citizen id!'`)

**Symptom:** these toasts always render in English regardless of the server's `setr qb_locale` value. Other notifies in our port go through `QBCore.Lang.t(...)` and respect locale.

**Upstream behavior:** `tmp/qb-multicharacter-upstream/server/main.lua:146` uses `Lang:t('notifications.char_deleted')`; the admin commands at `:212-214` use `Lang:t('notifications.deleted_other_char', { citizenid = ... })` and `Lang:t('notifications.forgot_citizenid')`.

**Why the simple "use QBCore.Lang.t" fix didn't work directly:** `QBCore.Lang` only carries qb-core's own translations (loaded from `qb-core/shared/translations-*.ts`). Each upstream resource has its own `Lang = Locale:new(...)` scoped to itself. Our port had to mirror that pattern — qb-multicharacter needed its own server-side Lang.

Two extra wrinkles:

1. **Substitution syntax mismatch.** qb-multicharacter's translations live in `translations/*.json` files designed for i18next on the React webview, using `{{name}}` interp. Our `Locale.t()` was built to match upstream Polyglot syntax `%{name}` (used by qb-core's translations). To dual-purpose the JSON, the regex in `qb-core/shared/locale.ts:translateKey` was widened to match BOTH `%{name}` AND `{{name}}` (single regex pass with two alternatives — `%\{name\}|\{\{name\}\}`). Backwards-compatible: every existing qb-core string still substitutes correctly.

2. **Cross-plugin TS import.** qb-multicharacter's new `shared/lang.ts` imports `Locale` from `[default]/qb-core/shared/locale` via a relative path (`../../../[default]/qb-core/shared/locale`). Bracket-folder paths work in TS module resolution and esbuild bundling — verified in the produced bundle.

**Fix shape (shipped):**
- `src/plugins/[default]/qb-core/shared/locale.ts:translateKey` regex now accepts both `%{name}` and `{{name}}` interpolation.
- `src/plugins/[qb]/qb-multicharacter/shared/lang.ts` (new) — imports the 15 JSON translation files, picks the active locale via `GetConvar('qb_locale', 'en')`, exports a Locale instance with English fallback. Mirrors the pattern in `qb-core/shared/lang.ts`.
- `src/plugins/[qb]/qb-multicharacter/server/index.ts` — three call sites now use `Lang.t('notifications.char_deleted')` / `Lang.t('notifications.deleted_other_char', { citizenid: args[0] })` / `Lang.t('notifications.forgot_citizenid')`.

**References:** `MEMORY.md` → `project_locale_dual_syntax.md` (new) for the design decision and how to extend to other ports.

---

## Tier 2 — open question (inherited upstream bug)

### 3. `spawnLastLocation` does nothing for SkipSelection players who don't own an apartment

**Location:** `src/plugins/[qb]/qb-multicharacter/client/index.ts:244-281`. Specifically `if (!result) return;` at line 250 inside the `apartments:GetOwnedApartment` callback.

**Trigger:** `Config.SkipSelection = true` AND the chosen character has no `player_houses`/`apartments` ownership row.

**Symptom:** server fires `qb-multicharacter:client:spawnLastLocation` with the saved coords, the client fires the `apartments:GetOwnedApartment` callback, the callback returns `nil`, the entire spawn handler bails out. Player is left at `Config.HiddenCoords` behind a black screen with no recovery.

**Upstream status:** identical bug at `tmp/qb-multicharacter-upstream/client/main.lua:140-168`. Whole spawn block is wrapped in `if result then ... end`. Not a port-introduced regression.

**Why the apartments callback gates spawn at all:** the original intent appears to be "restore the player to the apartment interior they were in when they disconnected." But the callback's `if result then` short-circuits the basic "teleport to saved coords" path too, which is the fallback that should always work.

**Proposed fix (deviates from upstream):**
```ts
QBCore.Functions.TriggerCallback('apartments:GetOwnedApartment', (result) => {
  if (result) {
    emit('apartments:client:SetHomeBlip', result.type);
  }
  // Always teleport to saved coords — interior restore is a refinement,
  // not a precondition.
  const ped = PlayerPedId();
  SetEntityCoords(ped, coords.x, coords.y, coords.z, false, false, false, true);
  SetEntityHeading(ped, coords.w);
  FreezeEntityPosition(ped, false);
  SetEntityVisible(ped, true, false);

  const insideMeta = QBCore.Functions.GetPlayerData().metadata.inside;
  DoScreenFadeOut(500);
  if (insideMeta?.house) {
    emit('qb-houses:client:LastLocationHouse', insideMeta.house);
  } else if (insideMeta?.apartment?.apartmentType && insideMeta?.apartment?.apartmentId) {
    emit(
      'qb-apartments:client:LastLocationHouse',
      insideMeta.apartment.apartmentType,
      insideMeta.apartment.apartmentId
    );
  }
  // (no else needed — we already teleported above)

  emitNet('QBCore:Server:OnPlayerLoaded');
  emit('QBCore:Client:OnPlayerLoaded');
  setTimeout(() => DoScreenFadeIn(250), 2000);
}, cData.citizenid);
```

**Decision needed:** match upstream (do nothing, accept the black-screen edge case) or deviate (always teleport, treat apartments interior as a refinement)? The latter is the correct behavior but is a documented deviation.

---

## Tier 3 — intentional divergences (keep, do not align)

These were considered against upstream and deliberately kept. Listed here so future contributors know they're choices, not oversights.

### qb-multicharacter/server/index.ts

- **`waitForPreloading` 10s timeout** (line 72-87). Upstream blocks forever on `repeat Wait(10) until hasDonePreloading[src]`. Defensive.
- **`safeLoadHouseData` try/catch wrapper** (line 89-100). Upstream calls `loadHouseData` directly. Defensive against missing `houselocations` table or oxmysql hang.
- **`readApartmentsStarting` parses `qb-apartments/config.lua`** (line 44-57). Upstream relies on `'@qb-apartments/config.lua'` shared_script declaration making `Apartments.Starting` a Lua global. Our TS bundle can't reach that — necessary technical workaround.
- **Explicit `closeNUI` before apartments handoff in `loadUserData`** (line 279). Upstream's Vue UI is small enough not to overlap qb-spawn's panel; our React shell stays mounted otherwise.
- **`_firstSpawn: true` marker on `newData`** (line 313). Travels through qb-apartments → qb-spawn unchanged, tells qb-spawn's React UI to hide the "Last Location" option for this player's first spawn. Without it, picking Last Location on a brand-new char teleports them into the createPed interior because `cData.position` is `Config.HiddenCoords` not a real spawn. u-core-only marker; properties prefixed with `_` are ignored by upstream code paths so it's safe to add.

### qb-multicharacter/client/index.ts

- **`sessionPollTick` citizenid guard** (line 165-173). Only fires `chooseChar` if `playerData?.citizenid` is missing. Upstream fires unconditionally on session start. Without the guard, restarting qb-multicharacter mid-game (e.g. via `pnpm dev`'s hot reload) reopens the character menu on top of whatever's currently showing.
- **`closeNUI` explicitly sends `SendNUIMessage({action:'ui',toggle:false})`** (line 211). Upstream just clears focus and deletes the ped. Our React shell stays mounted until told otherwise.
- **`createNewCharacter` doesn't translate localized 'Male'/'Female' string** (line 387-401). Upstream does `cData.gender = 0/1` based on `Lang:t('ui.male')` matching. Our webview sends the numeric value directly — simpler and avoids the localized-string round-trip.
- **`createNewCharacter` tears down sky cam + ped before `emitNet`** (line 394-395). Upstream doesn't. Without this, the multichar cam stays the active scripted cam and the player keeps seeing the character-creation interior even though qb-spawn's openUI fires correctly.

### qb-spawn/client/index.ts

- **`firstSpawnCamTarget` fallback for new-char openUI cam** (line 44, 177-179, 232-254). Upstream uses `playerData.position` directly. For brand-new chars that's missing or points at the createPed interior, leaving the cam unset (gameplay cam shows the ped at HiddenCoords — the "kitchen"). Stashed fallback fixes the visual.
- **`setupSpawns` plumbs `firstSpawn: true` through to React** (line 224-279). UI uses it to hide "Last Location" for new chars. Same root cause as the marker above.
- **`backToSelect` NUI callback** (line 325-331). UX improvement — "Back" button on the spawn screen returns to character selection. Upstream has no equivalent; once you commit to `selectCharacter`/`createNewCharacter` server-side you're locked into spawning.

---

## Cross-references

- `MEMORY.md` → `project_qbcore_multireturn_ffi.md` — `shared/compat.lua` (was `zz_compat.lua`) does multi-return shim + load-order shield.
- `MEMORY.md` → `project_onnet_vs_on_dual_register.md` — corrected analysis of `onNet` vs `on` semantics.
- `MEMORY.md` → `project_buildmanager_nui_js_drop.md` — BuildManager fix that was the actual cause of "no toasts / no DrawText" earlier in this session.
- `tmp/qb-core-upstream`, `tmp/qb-multicharacter-upstream`, `tmp/qb-spawn-upstream` — upstream sources used for this audit. Refresh with `git -C tmp/<name> pull --ff-only` before re-auditing.
