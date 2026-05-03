// Direct port of qb-core/shared/locale.lua. Class-based phrase store
// with `t(key, subs)` template substitution, `extend` (recursive
// merge of nested phrase tables → flat `'a.b.c' = 'phrase'` map),
// `delete`, `replace`, `clear`, `has`, `locale`. Behavior matches
// upstream Polyglot-style Locale.
//
// Substitution syntax: `%{name}` is replaced with `subs.name`.
// Lua-style `%s` positional substitution is NOT supported (upstream
// doesn't either — only template-named subs).

// `console` is provided by both the FXServer Node host and the CEF
// client runtime, but the shared typecheck project has neither lib
// enabled — declare just the one method we use here.
declare const console: {
  log(...args: unknown[]): void;
};

export type PhraseValue = string | { [key: string]: PhraseValue };
export type Phrases = Record<string, PhraseValue>;

export interface LocaleOpts {
  phrases?: Phrases;
  fallbackLang?: { phrases: Phrases };
  warnOnMissing?: boolean;
}

function translateKey(phrase: string, subs?: Record<string, unknown>): string {
  if (typeof phrase !== 'string') {
    throw new TypeError(
      'translateKey function expects arg #1 to be a string'
    );
  }
  if (!subs) return phrase;
  let result = phrase;
  for (const k of Object.keys(subs)) {
    // Escape regex specials in the key name; values are stringified
    // (matches Lua tostring()).
    const safeKey = k.replace(/[\\^$*+?.()|[\]{}]/g, '\\$&');
    const re = new RegExp(`%\\{${safeKey}\\}`, 'g');
    result = result.replace(re, String(subs[k]));
  }
  return result;
}

export class Locale {
  phrases: Record<string, string> = {};
  fallback: Locale | false = false;
  warnOnMissing: boolean;
  currentLocale?: string;

  constructor(opts: LocaleOpts = {}) {
    this.warnOnMissing =
      typeof opts.warnOnMissing !== 'boolean' ? true : opts.warnOnMissing;
    this.fallback = opts.fallbackLang
      ? new Locale({
          warnOnMissing: false,
          phrases: opts.fallbackLang.phrases,
        })
      : false;
    this.extend(opts.phrases ?? {});
  }

  /** Recursively flatten and merge `phrases` into this instance,
   *  joining nested keys with `.`. */
  extend(phrases: Phrases, prefix?: string): void {
    for (const key of Object.keys(phrases)) {
      const phrase = phrases[key];
      const prefixKey = prefix ? `${prefix}.${key}` : key;
      if (phrase !== null && typeof phrase === 'object') {
        this.extend(phrase as Phrases, prefixKey);
      } else {
        this.phrases[prefixKey] = phrase as string;
      }
    }
  }

  clear(): void {
    this.phrases = {};
  }

  replace(phrases?: Phrases): void {
    this.clear();
    this.extend(phrases ?? {});
  }

  /** Get/set the current locale tag. Returns the (possibly updated)
   *  current value. */
  locale(newLocale?: string): string | undefined {
    if (newLocale) this.currentLocale = newLocale;
    return this.currentLocale;
  }

  /** Resolve `key` to a phrase, applying `%{...}` subs. Falls back to
   *  the configured fallback Locale on miss; warns on miss if
   *  `warnOnMissing` is set. Returns the original key on total miss
   *  (matches upstream behavior — never throws). */
  t(key: string, subs?: Record<string, unknown>): string {
    const phrase = this.phrases[key];
    if (typeof phrase === 'string') {
      return translateKey(phrase, subs ?? {});
    }
    if (this.warnOnMissing) {
      console.log(`^3Warning: Missing phrase for key: "${key}"^0`);
    }
    if (this.fallback) {
      return this.fallback.t(key, subs);
    }
    return key;
  }

  has(key: string): boolean {
    return this.phrases[key] != null;
  }

  /** Recursively delete keys. `phraseTarget` may be a single string
   *  key or a nested phrase tree mirroring the original `extend`
   *  shape. */
  delete(phraseTarget: string | Phrases, prefix?: string): void {
    if (typeof phraseTarget === 'string') {
      delete this.phrases[phraseTarget];
      return;
    }
    for (const key of Object.keys(phraseTarget)) {
      const phrase = phraseTarget[key];
      const prefixKey = prefix ? `${prefix}.${key}` : key;
      if (phrase !== null && typeof phrase === 'object') {
        this.delete(phrase as Phrases, prefixKey);
      } else {
        delete this.phrases[prefixKey];
      }
    }
  }
}
