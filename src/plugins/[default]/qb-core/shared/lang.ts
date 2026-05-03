// `Lang` singleton — selects the active locale based on the
// `qb_locale` convar (default `en`), with English as the fallback for
// any keys missing in the active locale. Mirrors upstream's runtime
// pattern from `locale/<lng>.lua`:
//
//   if GetConvar('qb_locale', 'en') == '<lng>' then
//       Lang = Locale:new({ phrases = Translations, fallbackLang = Lang })
//   end
//
// Server and client each import this module from their own bundle,
// producing two independent Locale instances — same as upstream,
// where the shared script is loaded into both contexts.

import { Locale } from './locale';
import type { Phrases } from './locale';
import { Translations as ar } from './translations-ar';
import { Translations as cs } from './translations-cs';
import { Translations as de } from './translations-de';
import { Translations as en } from './translations-en';
import { Translations as es } from './translations-es';
import { Translations as fi } from './translations-fi';
import { Translations as fr } from './translations-fr';
import { Translations as it } from './translations-it';
import { Translations as ja } from './translations-ja';
import { Translations as nl } from './translations-nl';
import { Translations as ptBr } from './translations-pt-br';
import { Translations as pt } from './translations-pt';
import { Translations as sv } from './translations-sv';
import { Translations as tr } from './translations-tr';
import { Translations as vi } from './translations-vi';

const LOCALES: Record<string, Phrases> = {
  ar,
  cs,
  de,
  en,
  es,
  fi,
  fr,
  it,
  ja,
  nl,
  'pt-br': ptBr,
  pt,
  sv,
  tr,
  vi,
};

// FXServer's `GetConvar` exists in both the Lua and the Node host
// runtime; via @citizenfx/server (and /client) types it's a global
// `(varName: string, default_value: string) => string`. The shared
// project's tsconfig has neither lib enabled — declare what we use.
declare const GetConvar: (varName: string, defaultValue: string) => string;

function selectActiveLocale(): { code: string; phrases: Phrases } {
  // `typeof GetConvar` guard avoids breaking module evaluation in any
  // future test/SSR context that imports this file outside a FiveM
  // runtime (none today, but keeps the failure mode obvious).
  const code =
    typeof GetConvar === 'function'
      ? GetConvar('qb_locale', 'en') || 'en'
      : 'en';
  const phrases = LOCALES[code] ?? LOCALES['en'];
  return { code, phrases };
}

const englishFallback = new Locale({
  phrases: en,
  warnOnMissing: false,
});

const { code: activeCode, phrases: activePhrases } = selectActiveLocale();

export const Lang =
  activeCode === 'en'
    ? new Locale({ phrases: en, warnOnMissing: true })
    : new Locale({
        phrases: activePhrases,
        warnOnMissing: true,
        fallbackLang: { phrases: en },
      });

// Re-export the english-only fallback Locale for resources that want
// to bypass the active locale and force-English (rare; used by some
// admin tooling that doesn't translate).
export const LangEnglishFallback = englishFallback;
