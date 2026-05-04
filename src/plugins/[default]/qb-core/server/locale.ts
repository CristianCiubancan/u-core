/// <reference types="@citizenfx/server" />

// Per-account locale: each Rockstar license has one preferred language,
// shared across all the player's characters AND all qb-* plugins on the
// server. Persisted in `player_locales` (license-keyed). Cached in
// memory, populated on PlayerLoaded, evicted on OnPlayerUnload.
//
// API surface (exported from qb-core for cross-plugin use):
//   - `exports['qb-core']:GetPlayerLocale(src)` → string locale code,
//     or 'en' if unknown source / before login completes.
//   - `exports['qb-core']:SetPlayerLocale(src, code)` → boolean (true =
//     persisted; false = invalid code, no-op). Re-emits
//     `QBCore:Locale:Changed` net event so client-side state and webview
//     i18n re-localize live without re-login.
//   - `/locale <code>` chat command — player-facing entry point.
//
// Lookup-path semantics:
//   - GetPlayerLocale, loadLocaleForLicense: silent fallback to 'en' on
//     unknown/corrupt values. We never want the lookup to throw, even
//     if a hand-edited DB row contains nonsense.
//   - SetPlayerLocale + /locale: REJECT unknown codes with explicit
//     feedback. Silent fallback would let `/locale fr-CA` quietly
//     downgrade to English without telling the player.

import type { QBCoreShape } from './qbcore';

const oxmysql = (exports as any).oxmysql;

// The 15 locale codes we ship JSON/TS phrase tables for. Source of
// truth lives in `qb-core/shared/lang.ts` (server-default Lang) and
// each plugin's resource-scoped Lang. Kept in sync manually for now —
// if you add a 16th locale, update both this set and every plugin's
// LOCALES map.
const VALID_LOCALES = new Set([
  'ar',
  'cs',
  'de',
  'en',
  'es',
  'fi',
  'fr',
  'it',
  'ja',
  'nl',
  'pt',
  'pt-br',
  'sv',
  'tr',
  'vi',
]);

// license → locale code. Persists across reconnects within a server
// uptime (DB is the durable store; this is the read-through cache).
const localeByLicense = new Map<string, string>();

// source → locale code. Hot path for `LangFor(src)` lookups by other
// plugins; populated when a Player object is constructed by qb-core
// (via the `QBCore:Server:PlayerLoaded` hook below) and cleared on
// disconnect.
const localeBySource = new Map<number, string>();

async function bootstrapTable(): Promise<void> {
  // CREATE TABLE IF NOT EXISTS — idempotent, runs every boot. We
  // co-locate the schema with the code that depends on it so a fresh
  // checkout doesn't need an out-of-band migration step.
  try {
    await oxmysql.update_async(
      `CREATE TABLE IF NOT EXISTS player_locales (
        license     VARCHAR(64)  NOT NULL PRIMARY KEY,
        locale      VARCHAR(8)   NOT NULL DEFAULT 'en',
        updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
      []
    );
  } catch (err) {
    console.error('^1[qb-core]^7 player_locales bootstrap failed:', err);
  }
}

async function loadLocaleForLicense(license: string): Promise<string> {
  const cached = localeByLicense.get(license);
  if (cached) return cached;

  let code = 'en';
  try {
    const row = await oxmysql.single_async(
      'SELECT locale FROM player_locales WHERE license = ?',
      [license]
    );
    const stored = row?.locale as string | undefined;
    if (stored && VALID_LOCALES.has(stored)) {
      code = stored;
    }
  } catch (err) {
    console.error(
      `^3[qb-core]^7 loadLocaleForLicense(${license}) failed; defaulting to 'en':`,
      err
    );
  }

  localeByLicense.set(license, code);
  return code;
}

/**
 * Public lookup. Returns the player's preferred locale code, or 'en' if
 * the source is unknown (e.g. server console, or called before
 * PlayerLoaded has populated the cache).
 */
export function GetPlayerLocale(src: number): string {
  return localeBySource.get(src) ?? 'en';
}

/**
 * Ensure the player's locale is resolved (DB → cache → client).
 * Cache-first: returns immediately if `localeBySource` already has it.
 * Otherwise resolves the license, hits the DB, populates both caches,
 * and broadcasts `QBCore:Locale:Changed` to the client (so the client
 * cache and any open NUI re-localize at the same time).
 *
 * Why this exists: `QBCore:Server:PlayerLoaded` only fires after a
 * character is selected, but qb-multicharacter opens its NUI *before*
 * selection — so on relog its `openCharMenu` finds the cache empty and
 * the saved DB locale is never applied. The multichar
 * `GetNumberOfCharacters` callback awaits this and forwards the result
 * to the client, so the UI shows the right language on first open.
 */
export async function EnsurePlayerLocale(src: number): Promise<string> {
  const cached = localeBySource.get(src);
  if (cached) return cached;

  const license = (globalThis as any).GetPlayerIdentifierByType?.(
    String(src),
    'license'
  ) as string | undefined;
  if (!license) return 'en';

  const code = await loadLocaleForLicense(license);
  localeBySource.set(src, code);
  // Broadcast so any other resource's webview (e.g. qb-spawn) that's
  // already up gets the live re-localize too. Cheap idempotent push.
  emitNet('QBCore:Locale:Changed', src, code);
  return code;
}

/**
 * Persist + cache the player's locale preference. Returns true on
 * success, false if `code` isn't one of our 15 supported locales.
 *
 * Side effects on success:
 *   - Updates `player_locales` row (UPSERT keyed by license).
 *   - Updates both caches.
 *   - Emits `QBCore:Locale:Changed` net event to the player's client
 *     so the qb-core client-side cache + any open NUI re-localize.
 *   - Emits `QBCore:Server:LocaleChanged` local event for any server
 *     resource that wants to react (e.g. to invalidate per-player
 *     translation caches).
 */
export async function SetPlayerLocale(
  src: number,
  code: string
): Promise<boolean> {
  if (!VALID_LOCALES.has(code)) return false;

  const license = (globalThis as any).GetPlayerIdentifierByType?.(
    String(src),
    'license'
  ) as string | undefined;
  if (!license) {
    // No license = not a real player connection (or identifier hasn't
    // resolved yet). Cache-only update so the runtime still reflects
    // it for the current session, but skip the DB write.
    localeBySource.set(src, code);
    emitNet('QBCore:Locale:Changed', src, code);
    emit('QBCore:Server:LocaleChanged', src, code);
    return true;
  }

  try {
    await oxmysql.insert_async(
      `INSERT INTO player_locales (license, locale)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE locale = VALUES(locale)`,
      [license, code]
    );
  } catch (err) {
    console.error('^1[qb-core]^7 SetPlayerLocale persist failed:', err);
    return false;
  }

  localeByLicense.set(license, code);
  localeBySource.set(src, code);
  emitNet('QBCore:Locale:Changed', src, code);
  emit('QBCore:Server:LocaleChanged', src, code);
  return true;
}

export function installLocale(QBCore: QBCoreShape): void {
  void bootstrapTable();

  on('QBCore:Server:PlayerLoaded', async (player: any) => {
    const src = player?.PlayerData?.source as number | undefined;
    const license = player?.PlayerData?.license as string | undefined;
    if (!src || !license) return;
    const code = await loadLocaleForLicense(license);
    localeBySource.set(src, code);
    // Push to the client immediately so qb-core/client/locale.ts caches
    // it before any other resource calls `GetCurrentLocale` and before
    // the multichar NUI opens.
    emitNet('QBCore:Locale:Changed', src, code);
  });

  on('QBCore:Server:OnPlayerUnload', (src: number) => {
    localeBySource.delete(src);
  });

  // Net entry point for NUI-driven locale pickers (e.g. qb-multicharacter's
  // dropdown). Same validation/persistence as `/locale` and the
  // SetPlayerLocale export — just routed via a net event so any plugin
  // webview can `fetchNui('setLocale', {code})` → its client `emitNet`s
  // here without each one having to import qb-core's TS types or
  // duplicate the export-call boilerplate. Errors silently no-op (the
  // webview re-renders to current locale on the localeChanged echo, so
  // a rejected change is self-evident).
  onNet('QBCore:Server:SetLocale', async (code: unknown) => {
    const src = (global as any).source as number;
    if (typeof code !== 'string' || !code) return;
    await SetPlayerLocale(src, code.toLowerCase());
  });

  // Player-facing chat command. Not admin-gated — anyone can change
  // their own locale. Validates against VALID_LOCALES; rejects
  // unknown codes with a notify so silent-fallback to English doesn't
  // surprise the player.
  (QBCore as any).Commands.Add(
    'locale',
    'Set your preferred language for QBCore notifications & UI',
    [
      {
        name: 'code',
        help: 'Language code (en, ar, cs, de, es, fi, fr, it, ja, nl, pt, pt-br, sv, tr, vi)',
      },
    ],
    false,
    async (source: number, args: string[]) => {
      const raw = args?.[0];
      if (!raw) {
        emitNet('QBCore:Notify', source, 'Usage: /locale <code>', 'error');
        return;
      }
      const code = raw.toLowerCase();
      const ok = await SetPlayerLocale(source, code);
      if (ok) {
        emitNet(
          'QBCore:Notify',
          source,
          `Locale set to ${code}`,
          'success'
        );
      } else {
        emitNet(
          'QBCore:Notify',
          source,
          `Unknown locale: ${code}. Supported: ${Array.from(VALID_LOCALES).join(', ')}`,
          'error'
        );
      }
    }
  );

  const exportFn = (globalThis as any).exports as (
    name: string,
    fn: unknown
  ) => void;
  exportFn('GetPlayerLocale', GetPlayerLocale);
  exportFn('SetPlayerLocale', SetPlayerLocale);
  exportFn('EnsurePlayerLocale', EnsurePlayerLocale);
}
