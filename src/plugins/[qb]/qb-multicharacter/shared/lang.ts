// Resource-scoped Lang for qb-multicharacter. Mirrors upstream's
// per-resource pattern (`Lang = Locale:new({ phrases = Translations })`
// in `tmp/qb-multicharacter-upstream/locales/<lng>.lua`) — qb-core has
// its own Lang instance loaded from its own translations; we don't
// share keys.
//
// Translations live in `../translations/*.json` and are dual-purposed:
// the React webview consumes them via i18next (with `{{name}}` interp),
// and the server side consumes the same files via the qb-core
// `Locale` class — which accepts both `%{name}` and `{{name}}` interp
// (see `[default]/qb-core/shared/locale.ts`). Single source of truth,
// no duplication.
//
// Two server-side surfaces:
//
//   * `Lang` — the SERVER-DEFAULT locale instance, picked once at
//     module load from the `qb_locale` convar. Use this for messages
//     where there's no recipient (server console logs, broadcast
//     events).
//
//   * `LangFor(src)` — looks up the recipient's per-account locale via
//     `exports['qb-core']:GetPlayerLocale(src)` on every call (cheap;
//     the lookup is a Map.get server-side) and returns the appropriate
//     Locale instance from the all-15-loaded `ALL_LOCALES` map. Use
//     this for any `emitNet('QBCore:Notify', src, …)` style call where
//     a specific player is the target.

import { Locale } from '../../../[default]/qb-core/shared/locale';
import type { Phrases } from '../../../[default]/qb-core/shared/locale';
import ar from '../translations/ar.json';
import cs from '../translations/cs.json';
import de from '../translations/de.json';
import en from '../translations/en.json';
import es from '../translations/es.json';
import fi from '../translations/fi.json';
import fr from '../translations/fr.json';
import it from '../translations/it.json';
import ja from '../translations/ja.json';
import nl from '../translations/nl.json';
import ptBr from '../translations/pt-br.json';
import pt from '../translations/pt.json';
import sv from '../translations/sv.json';
import tr from '../translations/tr.json';
import vi from '../translations/vi.json';

const PHRASES_BY_CODE: Record<string, Phrases> = {
  ar: ar as Phrases,
  cs: cs as Phrases,
  de: de as Phrases,
  en: en as Phrases,
  es: es as Phrases,
  fi: fi as Phrases,
  fr: fr as Phrases,
  it: it as Phrases,
  ja: ja as Phrases,
  nl: nl as Phrases,
  'pt-br': ptBr as Phrases,
  pt: pt as Phrases,
  sv: sv as Phrases,
  tr: tr as Phrases,
  vi: vi as Phrases,
};

declare const GetConvar: (varName: string, defaultValue: string) => string;

// Build Locale instances eagerly for all 15. They're small (a Map of
// key→string per locale) and per-call lookup of `LangFor(src)` would
// otherwise have to lazily construct on first use — extra branching
// for no real win since memory cost is negligible.
function buildAllLocales(): Record<string, Locale> {
  const result: Record<string, Locale> = {};
  const englishPhrases = PHRASES_BY_CODE['en'];
  for (const code of Object.keys(PHRASES_BY_CODE)) {
    const phrases = PHRASES_BY_CODE[code];
    result[code] =
      code === 'en'
        ? new Locale({ phrases, warnOnMissing: true })
        : new Locale({
            phrases,
            warnOnMissing: true,
            fallbackLang: { phrases: englishPhrases },
          });
  }
  return result;
}

const ALL_LOCALES: Record<string, Locale> = buildAllLocales();

// Server-default locale for non-recipient-specific messages. Read once
// at module load — convar changes mid-runtime require a resource
// restart to take effect (matches upstream qb-core's behavior).
const SERVER_DEFAULT_CODE =
  typeof GetConvar === 'function'
    ? GetConvar('qb_locale', 'en') || 'en'
    : 'en';

export const Lang: Locale = ALL_LOCALES[SERVER_DEFAULT_CODE] ?? ALL_LOCALES['en'];

/**
 * Pick the recipient's preferred Locale based on the per-account locale
 * lookup in qb-core. Falls back to `Lang` (server-default) on any
 * miss — qb-core's `GetPlayerLocale` already silent-falls-back to 'en',
 * so the only way to land outside that is if the `qb-core` export
 * isn't reachable yet (extremely rare; would mean qb-core hasn't
 * registered its exports during startup).
 */
export function LangFor(src: number): Locale {
  let code: string;
  try {
    code = (exports as any)['qb-core'].GetPlayerLocale(src) as string;
  } catch {
    return Lang;
  }
  return ALL_LOCALES[code] ?? Lang;
}
