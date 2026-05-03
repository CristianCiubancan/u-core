// One-shot helper: mechanically converts qb-core's `locale/<lng>.lua`
// files into TypeScript `Translations` objects for our qb-core port.
// Idempotent — re-run to re-sync if upstream churns.
//
// Locale set is u-core's 15-locale baseline (matches qb-multicharacter
// and qb-spawn locale sets per `project_port_handoff_checklist`):
//   ar, cs, de, en, es, fi, fr, it, ja, nl, pt-br, pt, sv, tr, vi
//
// Upstream uses `vn.lua` for Vietnamese; our baseline uses `vi`. The
// script maps vn→vi for filename and field-key consistency.
//
// Lua → TS transforms applied:
//   `key = '...'`               → `key: '...'`
//   `key = { ... }`              → `key: { ... }`
//   `key = function() ... end`   → omitted (locale files don't have these)
//   `nil`                        → `null`
//   Lua comments (`-- ...`)      → stripped
//   Lua single-quote escapes (`\'`) → preserved (same in TS)
//   Lua double-quote escapes (`\"`) → preserved (same in TS)

import fs from 'node:fs';
import path from 'node:path';

const repo = path.resolve(import.meta.dirname, '..');
const upstreamDir = path.join(repo, 'tmp/qb-core-upstream/locale');
const outDir = path.join(repo, 'src/plugins/[default]/qb-core/shared');

// 15-locale baseline. Map upstream filename → our locale code.
const LOCALES = [
  ['ar', 'ar'],
  ['cs', 'cs'],
  ['de', 'de'],
  ['en', 'en'],
  ['es', 'es'],
  ['fi', 'fi'],
  ['fr', 'fr'],
  ['it', 'it'],
  ['ja', 'ja'],
  ['nl', 'nl'],
  ['pt-br', 'pt-br'],
  ['pt', 'pt'],
  ['sv', 'sv'],
  ['tr', 'tr'],
  ['vn', 'vi'],
];

function stripLuaComments(src) {
  const out = [];
  let i = 0;
  let inString = false;
  let stringQuote = '';
  while (i < src.length) {
    const c = src[i];
    if (inString) {
      out.push(c);
      if (c === '\\' && i + 1 < src.length) {
        out.push(src[i + 1]);
        i += 2;
        continue;
      }
      if (c === stringQuote) inString = false;
      i++;
      continue;
    }
    if (c === "'" || c === '"') {
      out.push(c);
      inString = true;
      stringQuote = c;
      i++;
      continue;
    }
    if (c === '-' && src[i + 1] === '-') {
      while (i < src.length && src[i] !== '\n') i++;
      continue;
    }
    out.push(c);
    i++;
  }
  return out.join('');
}

function extractTableBody(src, prefixRegex) {
  const m = src.match(prefixRegex);
  if (!m) throw new Error(`Couldn't find ${prefixRegex} in source`);
  const start = m.index + m[0].length;
  let depth = 1;
  let i = start;
  while (i < src.length && depth > 0) {
    const c = src[i];
    if (c === "'" || c === '"') {
      const q = c;
      i++;
      while (i < src.length) {
        if (src[i] === '\\') {
          i += 2;
          continue;
        }
        if (src[i] === q) {
          i++;
          break;
        }
        i++;
      }
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') depth--;
    i++;
  }
  return src.slice(start, i - 1);
}

// Split a table body on top-level commas (commas at depth 0, ignoring
// strings).
function splitEntries(body) {
  const out = [];
  let i = 0;
  let entryStart = 0;
  let depth = 0;
  let inString = false;
  let q = '';
  while (i < body.length) {
    const c = body[i];
    if (inString) {
      if (c === '\\') {
        i += 2;
        continue;
      }
      if (c === q) inString = false;
      i++;
      continue;
    }
    if (c === "'" || c === '"') {
      inString = true;
      q = c;
      i++;
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') depth--;
    else if (c === ',' && depth === 0) {
      out.push(body.slice(entryStart, i).trim());
      entryStart = i + 1;
    }
    i++;
  }
  const tail = body.slice(entryStart).trim();
  if (tail) out.push(tail);
  return out.filter((s) => s.length > 0);
}

// Convert one entry text "key = value" to "key: value" (TS object
// property). `value` may be a string literal, nested table, or other.
function convertEntry(entry) {
  // Find the first `=` not inside a string.
  let eqIdx = -1;
  let inString = false;
  let q = '';
  for (let i = 0; i < entry.length; i++) {
    const c = entry[i];
    if (inString) {
      if (c === '\\') {
        i++;
        continue;
      }
      if (c === q) inString = false;
      continue;
    }
    if (c === "'" || c === '"') {
      inString = true;
      q = c;
      continue;
    }
    if (c === '=' && entry[i + 1] !== '=' && entry[i - 1] !== '=') {
      eqIdx = i;
      break;
    }
  }
  if (eqIdx < 0) return entry;
  const rawKey = entry.slice(0, eqIdx).trim();
  // Lua identifier → TS identifier; preserve as-is for typical keys.
  // Hyphens or other chars need quoting — we don't expect them in
  // qb-core locales but quote defensively.
  const needsQuote = !/^[A-Za-z_][A-Za-z0-9_]*$/.test(rawKey);
  const key = needsQuote ? `'${rawKey.replace(/'/g, "\\'")}'` : rawKey;
  let val = entry.slice(eqIdx + 1).trim();
  // Lua nil → null
  if (val === 'nil') val = 'null';
  // Nested table
  if (val.startsWith('{') && val.endsWith('}')) {
    const inner = val.slice(1, -1).trim();
    val = `{ ${convertBody(inner)} }`;
  }
  // Strings stay as-is (single quotes / double quotes / escapes are
  // compatible with TS).
  return `${key}: ${val}`;
}

function convertBody(body) {
  return splitEntries(body).map(convertEntry).join(', ');
}

function generateLocaleTs(luaSrc, lngCode) {
  const cleaned = stripLuaComments(luaSrc);
  const body = extractTableBody(cleaned, /local Translations\s*=\s*\{/);
  const inner = convertBody(body);
  const header = [
    `// Mechanically generated from upstream qb-core/locale/${lngCode}.lua`,
    '// via scripts/port-qb-locales.mjs. Re-run to re-sync after upstream',
    '// updates. Consumed by `shared/lang.ts` when qb_locale convar matches.',
    '',
    "import type { Phrases } from './locale';",
    '',
    'export const Translations: Phrases = {',
  ].join('\n');
  // Re-format with light pretty-printing — split top-level entries
  // onto their own lines for readability.
  const entries = splitEntries(body).map(convertEntry);
  const formatted = entries.map((e) => `  ${e},`).join('\n');
  return [header.replace('{', '{'), formatted, '};', ''].join('\n');
}

for (const [upstream, our] of LOCALES) {
  const inFile = path.join(upstreamDir, `${upstream}.lua`);
  if (!fs.existsSync(inFile)) {
    console.warn(`Skipping ${upstream}: source file not found`);
    continue;
  }
  const lua = fs.readFileSync(inFile, 'utf8');
  const ts = generateLocaleTs(lua, upstream);
  const outFile = path.join(outDir, `translations-${our}.ts`);
  fs.writeFileSync(outFile, ts, 'utf8');
  console.log(`✓ translations-${our}.ts (from ${upstream}.lua)`);
}

console.log('\nDone. Wire each locale into `shared/lang.ts`.');
