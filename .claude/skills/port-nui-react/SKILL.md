---
name: port-nui-react
description: Port a qbcore-framework resource's NUI from upstream Vue/HTML to this codebase's React webview, keeping the upstream Lua scripts byte-identical. Invoke as `/port-nui-react <resource-name>` (e.g. `/port-nui-react qb-multicharacter`). The skill carries the procedure, the codebase-wide constraints, and the gotchas; per-resource design decisions (visual direction, layout, screens) must be agreed with the user in conversation before any code is written.
---

# Port a qbcore-framework resource's NUI to React

The argument passed to this skill is the resource name (e.g. `qb-multicharacter`, `qb-spawn`). Confirm it from the user's invocation before assuming.

Goal: replace the resource's Vue/HTML NUI with a React webview built on this codebase's shared infra. The upstream Lua scripts stay byte-identical.

## Step 1 — Align with the user (do not skip)

Before writing any code, do all of:

1. **Locate the resource** at `src/plugins/[<group>]/<resource>/`. Confirm it currently ships upstream Lua + upstream Vue UI in `html/`. If `html/Page.tsx` already exists or any other rewrite is in flight, surface that to the user; don't silently overwrite.

2. **Derive the NUI contract from `client/main.lua`** (or `client.lua` for resources without a `client/` subdirectory):
    - Every `RegisterNUICallback('name', function(data, cb) ...)` is an outbound `fetchNui` endpoint. Capture the name and what fields the handler reads from `data`.
    - Every `SendNUIMessage({ action = 'name', ... })` is an inbound `useNuiEvent` action. Capture the name and every field on the message object.
    - **Match upstream's typos verbatim** on the wire — qb-spawn uses `appartment` (double-p); that's a contract, not a bug to fix.
    - Watch for "value compared by localized phrase" patterns. Example from qb-multicharacter's `createNewCharacter`: `if cData.gender == Lang:t('ui.male') then cData.gender = 0`. The React side must send the localized phrase string, not a normalized 0/1 — surface this to the user as a contract gotcha.

3. **Read the upstream Vue source** at `src/plugins/[<group>]/<resource>/html/{index.html,app.js}` (and any sibling `validation.js`, `translations.js`, etc.). This tells you the screens, the flow, the loading sequence pacing, and any client-side rules (profanity check, validation, etc.).

4. **State your understanding back to the user** in 5–8 bullets:
    - Resource path + current state.
    - The full NUI contract — every `fetchNui` name, every `useNuiEvent` action, with payload field names.
    - The screens and flow (loading → grid → register → delete dialog, etc.) and any pacing the upstream Vue UI uses.
    - Any contract gotchas (localized-phrase comparisons, upstream typos, downstream `TriggerEvent` calls that consume specific field shapes).
    - Your proposed visual direction, or "I have no opinion, what direction do you want?" — never silently pick a layout.
    - The exact divergences from upstream Lua you intend to apply (camera rotation, etc.) and the `-- u-core:` justification for each.

5. **Wait for a nod or correction.** Skipping this and writing code on assumed direction has produced UI the user didn't want. Don't.

## Step 2 — Execute (after alignment)

1. **Backup the upstream `html/`**:
    ```bash
    mkdir -p upstream-reference
    cp -R 'src/plugins/[<group>]/<resource>/html' 'upstream-reference/<resource>-html'
    rm -rf 'src/plugins/[<group>]/<resource>/html'
    ```
    `upstream-reference/` is gitignored.

2. **Write `Page.tsx`** at `src/plugins/[<group>]/<resource>/html/Page.tsx`:
    - Use components from `@/components/ui/*` (shadcn): Button, Input, Label, Select, AlertDialog, Dialog, DatePicker, Card, ScrollArea, Separator, Tooltip. Hand-roll only when none fits.
    - Theme via shadcn semantic tokens (`text-primary`, `bg-card`, `border-border`, `bg-background`, `text-foreground`, `text-muted-foreground`, `bg-destructive`) and brand utilities (`text-brand-500`, `bg-brand-400` etc.) for direct shade access. **Never** use raw Tailwind palette names like `amber-*`/`emerald-*`/`slate-*` — they get purged by the trimmed safelist (see `project_webview_theme_tooling`).
    - **No `backdrop-filter` / `backdrop-blur-*`.** The shadcn `Card`, `Dialog` overlay, `Dialog` content, and `Select` content all ship with `backdrop-blur-*` baked in — override via `className` with an opaque `bg-*/95` and `backdrop-blur-none` (see `project_backdrop_filter_cost_cef`).
    - **Translation strategy.** Implement a `tx(key, fallback)` helper that reads from upstream's `translations` payload (delivered on the resource's open message — verify exact action name from `client/main.lua`'s flatten loop). For React-only strings (eyebrows, error captions, decorative labels) add new `ui.*` keys to `src/plugins/[<group>]/<resource>/locales/en.lua` only, with a `-- u-core:` comment block flagging the divergence. Polyglot's `fallbackLang` chain delivers the en value to the other 14 locales for free.
    - **Form UX:** validate on submit only (not blur), short tracked-out caps captions per field, clear errors per-field on edit. Cancel/Close buttons next to validated inputs need `onMouseDown={(e) => e.preventDefault()}` to avoid the blur cascade eating the click.
    - **Radix Select coordination:** when more than one Select can be open simultaneously, hoist a single `openSelect` state and pass coordinated `open`/`onOpenChange` to each. Memoize `<SelectContent>` children for large option lists — closed Selects still evaluate JSX children every parent re-render.

3. **Update `plugin.json`'s `files` list** to React shape: `["html/index.html", "html/main.js"]` plus any data JSON the Lua side reads via `LoadResourceFile` (e.g. `countries.json` for qb-multicharacter). Drop the upstream Vue assets (`vue.js`, `style.css`, `swal2.js`, etc.) from the list — they're gone with the `html/` directory.

4. **Build + verify:**
    - `pnpm build` should succeed with the webview compiled (look for `✓ Built webview for plugin <resource>`).
    - The dist tree at `txData/${SERVER_NAME}/resources/[GENERATED]/[<group>]/<resource>/` should have `html/index.html` + `html/main.js`, the upstream Lua files byte-identical to source, and a generated `fxmanifest.lua` whose `client_scripts` / `server_scripts` / `shared_scripts` order matches upstream exactly (load order matters for the locale fallback chain).

5. **Tell the user to test in-game** and wait for a verdict before celebrating.

## Codebase-wide constraints (project memories — read these names; the bodies are auto-loaded into context)

- `project_webview_theme_tooling` — what utility classes exist, brand+gray theme system, safelist trims to active palette
- `project_backdrop_filter_cost_cef` — no blur anywhere; CEF support uncertain
- `project_select_jsx_eval_cost` — memoize SelectContent children for big lists
- `project_form_error_ux` — short tracked-out captions, defaultValue pattern
- `project_send_nui_message_scope` — SendNUIMessage is resource-scoped; can't centralize a relay
- `project_port_handoff_checklist` — the general Lua-in/Lua-out + recipe-skip flow
- `project_buildmanager_import_aware_assets` — JSON imported by Page.tsx is bundled, not re-shipped as a raw file
- `feedback_validate_on_submit` — submit-only validation
- `feedback_dismiss_blur_cascade` — `onMouseDown preventDefault` on Cancel/Close
- `feedback_radix_select_onblur` — coordinated open state for sibling Selects
- `feedback_conservative_port_strategy` — Lua-in/Lua-out as default; divergences need a concrete reason

If a constraint above conflicts with what you're trying to build, **argue back to the user** before silently violating it.

## Anti-patterns

- **Do not modify the upstream Lua scripts** unless applying a deliberate divergence with a `-- u-core:` comment block for a concrete reason approved by the user. The default is byte-identical-to-upstream.
- **Do not reinstate features from prior rewrites of this resource** (per-account locale, `GetPlayerLocale`/`SetPlayerLocale` exports, `LocalePicker` component, `firstSpawn` cData marker, `setupSpawns` net-safety dual-register, etc.) without explicit user approval. They were intentionally removed; carry-over is a regression.
- **Do not use i18next bundles** for this resource type. No `useTranslation`, no `i18n.addResourceBundle`, no `translations/*.json` imports. Translation flows entirely through upstream's `Lang:t()` → `translations` payload → `tx()` helper. Adding i18next creates drift between Lua-side and React-side translation tables.
- **Do not carry over component decompositions** from a previous rewrite of the same resource without re-deriving them. Visual direction is a per-rewrite decision; structure follows from it, not from inherited habit.
- **Do not skip the alignment step.** "I'll get something on screen and we'll iterate" is how the previous attempt produced a UI that didn't match what the user wanted. Align first.
