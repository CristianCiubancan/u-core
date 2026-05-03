// One-shot helper: mechanically converts qb-core's `shared/items.lua`
// and `shared/vehicles.lua` (which are pure data tables — every line
// has the same `key = { field = value, ... }` shape) into TypeScript
// const exports for our qb-core port. Idempotent — re-run if upstream
// updates the data.
//
// Lua → TS transforms applied:
//   `name = { ... }`        → `name: { ... },`
//   `key = value`           → `key: value`
//   `nil`                   → `null`
//   `true`/`false`          → unchanged
//   `'apostrophe\'d'`       → preserved (Lua and TS both use \' in single-quoted)
//   `[`hash`]` table key    → unwrapped to plain identifier (vehicles is hash-keyed
//                             via Lua backticks; we re-key by `model` string instead).
//
// The output isn't pretty-printed beyond what's necessary; tooling
// like prettier can clean it up if desired.

import fs from 'node:fs';
import path from 'node:path';

const repo = path.resolve(import.meta.dirname, '..');
const upstreamDir = path.join(
  repo,
  'txData/Nightveil/resources/[qb]/qb-core/shared'
);
const outDir = path.join(repo, 'src/plugins/[default]/qb-core/shared');

/**
 * Strip the wrapping `<prefix> { ... }` and return the inner content
 * (everything between the outermost `{` and matching `}`).
 * @param prefixRegex RegExp matching everything up to and including
 *   the opening `{` of the table assignment. Examples:
 *     - `/QBShared\.Items\s*=\s*\{/`
 *     - `/local Vehicles\s*=\s*\{/`
 */
function extractTableBody(luaSource, prefixRegex) {
  const startMatch = luaSource.match(prefixRegex);
  if (!startMatch) {
    throw new Error(`Couldn't find ${prefixRegex} in source`);
  }
  const startIdx = startMatch.index + startMatch[0].length;
  // Find matching closing brace, ignoring braces inside strings.
  let depth = 1;
  let i = startIdx;
  while (i < luaSource.length && depth > 0) {
    const c = luaSource[i];
    if (c === "'" || c === '"') {
      // Skip string literal
      const quote = c;
      i++;
      while (i < luaSource.length) {
        if (luaSource[i] === '\\') {
          i += 2;
          continue;
        }
        if (luaSource[i] === quote) {
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
  // i now points one past the closing brace
  return luaSource.slice(startIdx, i - 1);
}

/**
 * Convert a Lua entry-line key into a TS object property key.
 * Strips leading/trailing whitespace and any `["..."]` syntax around
 * the key. For vehicle entries the key is a Lua backtick-hashed
 * identifier (e.g. `\`adder\``); we just take the inner name.
 */
function normalizeKey(rawKey) {
  let key = rawKey.trim();
  // [`adder`] → adder
  if (key.startsWith('[`') && key.endsWith('`]')) {
    return key.slice(2, -2);
  }
  // ["something"] → something
  const bracketStr = /^\[\s*['"](.+)['"]\s*\]$/;
  const m = key.match(bracketStr);
  if (m) return m[1];
  return key;
}

/**
 * Walk the table body, splitting top-level entries (entries separated
 * by commas at depth 0). Each entry is `key = { ... }`. Returns an
 * array of `{ key, body }` strings where body is the literal Lua
 * `{ ... }` value text.
 */
function splitEntries(body) {
  const out = [];
  let i = 0;
  let entryStart = 0;
  let depth = 0;
  let inString = false;
  let stringQuote = '';
  while (i < body.length) {
    const c = body[i];
    if (inString) {
      if (c === '\\') {
        i += 2;
        continue;
      }
      if (c === stringQuote) {
        inString = false;
      }
      i++;
      continue;
    }
    if (c === "'" || c === '"') {
      inString = true;
      stringQuote = c;
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

/**
 * For an entry like `weapon_pistol = { ... }`, return the key and
 * the inner body text (everything between the {} of the value).
 */
function parseEntry(entry) {
  const eqIdx = entry.indexOf('=');
  if (eqIdx < 0) return null;
  const rawKey = entry.slice(0, eqIdx);
  const rest = entry.slice(eqIdx + 1).trim();
  if (!rest.startsWith('{') || !rest.endsWith('}')) return null;
  return {
    key: normalizeKey(rawKey),
    body: rest.slice(1, -1).trim(),
  };
}

/**
 * Convert a Lua entry body (`name = '...', weight = 1000, ammotype = nil, ...`)
 * to a TS object body (`name: '...', weight: 1000, ammotype: null, ...`).
 *
 * Handles:
 *   - `key = value` → `key: value`
 *   - `nil` → `null`
 *   - nested `{...}` (preserves inner structure verbatim — items/vehicles
 *     don't have nested objects inside entries except in rare cases)
 */
function convertBody(body) {
  // Split body on top-level commas, then per-segment replace `key = ` with `key: `.
  const segments = [];
  let depth = 0;
  let segStart = 0;
  let inString = false;
  let stringQuote = '';
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (inString) {
      if (c === '\\') {
        i++;
        continue;
      }
      if (c === stringQuote) inString = false;
      continue;
    }
    if (c === "'" || c === '"') {
      inString = true;
      stringQuote = c;
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') depth--;
    else if (c === ',' && depth === 0) {
      segments.push(body.slice(segStart, i).trim());
      segStart = i + 1;
    }
  }
  const tail = body.slice(segStart).trim();
  if (tail) segments.push(tail);

  return segments
    .map((seg) => {
      // Find the first `=` that isn't inside a string or brackets.
      let eqIdx = -1;
      let s = false;
      let sq = '';
      let d = 0;
      for (let i = 0; i < seg.length; i++) {
        const c = seg[i];
        if (s) {
          if (c === '\\') {
            i++;
            continue;
          }
          if (c === sq) s = false;
          continue;
        }
        if (c === "'" || c === '"') {
          s = true;
          sq = c;
          continue;
        }
        if (c === '[') d++;
        else if (c === ']') d--;
        else if (c === '=' && d === 0) {
          eqIdx = i;
          break;
        }
      }
      if (eqIdx < 0) return seg;
      const k = seg.slice(0, eqIdx).trim();
      let v = seg.slice(eqIdx + 1).trim();
      // Lua `nil` → TS `null`
      if (v === 'nil') v = 'null';
      // Recurse if value is a nested table
      if (v.startsWith('{') && v.endsWith('}')) {
        const inner = v.slice(1, -1).trim();
        v = `{ ${convertBody(inner)} }`;
      }
      return `${k}: ${v}`;
    })
    .join(', ');
}

/**
 * Remove Lua single-line comments (`-- ...` to end-of-line) from
 * `source`, leaving everything else intact. Comments inside string
 * literals are preserved (so a description that contains `--` won't
 * be mangled).
 */
function stripLuaComments(source) {
  const out = [];
  let i = 0;
  let inString = false;
  let stringQuote = '';
  while (i < source.length) {
    const c = source[i];
    if (inString) {
      out.push(c);
      if (c === '\\' && i + 1 < source.length) {
        out.push(source[i + 1]);
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
    if (c === '-' && source[i + 1] === '-') {
      // Skip to end of line.
      while (i < source.length && source[i] !== '\n') i++;
      continue;
    }
    out.push(c);
    i++;
  }
  return out.join('');
}

function generateTsFile(body, header, footer, opts = {}) {
  const { keyField } = opts;
  const cleaned = stripLuaComments(body);
  const entries = splitEntries(cleaned);
  const lines = [];
  for (const raw of entries) {
    let key, innerBody;
    if (keyField) {
      // Anonymous entry: `{ field = value, ... }`. Use one of the
      // fields as the TS map key.
      const trimmed = raw.trim();
      if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) continue;
      const inner = trimmed.slice(1, -1).trim();
      innerBody = convertBody(inner);
      // Extract the key value from innerBody — it'll look like `key: 'value'`.
      const keyRe = new RegExp(`\\b${keyField}\\s*:\\s*['"]([^'"]+)['"]`);
      const km = innerBody.match(keyRe);
      if (!km) continue;
      key = km[1];
    } else {
      const parsed = parseEntry(raw);
      if (!parsed) continue;
      key = parsed.key;
      innerBody = convertBody(parsed.body);
    }
    lines.push(`  ${key}: { ${innerBody} },`);
  }
  return [header, ...lines, footer].join('\n');
}

// --- Items ---
{
  const luaSrc = fs.readFileSync(path.join(upstreamDir, 'items.lua'), 'utf8');
  const body = extractTableBody(luaSrc, /QBShared\.Items\s*=\s*\{/);
  const header = [
    '// Mechanically generated from qb-core/shared/items.lua via',
    '// scripts/port-qb-shared.mjs. Drop-in for `QBCore.Shared.Items`',
    '// consumers (qb-inventory, qb-shops, qb-policejob, etc.).',
    '',
    'export interface Item {',
    '  name: string;',
    '  label: string;',
    '  weight: number;',
    "  type: 'weapon' | 'item';",
    '  ammotype?: string | null;',
    '  image: string;',
    '  unique: boolean;',
    '  useable: boolean;',
    '  shouldClose?: boolean;',
    '  combinable?: unknown;',
    '  description: string;',
    '}',
    '',
    'export const Items: Record<string, Item> = {',
  ].join('\n');
  const footer = '};\n';
  fs.writeFileSync(path.join(outDir, 'items.ts'), generateTsFile(body, header, footer), 'utf8');
  console.log('✓ items.ts written');
}

// --- Vehicles ---
{
  const luaSrc = fs.readFileSync(
    path.join(upstreamDir, 'vehicles.lua'),
    'utf8'
  );
  const body = extractTableBody(luaSrc, /local Vehicles\s*=\s*\{/);
  const header = [
    '// Mechanically generated from qb-core/shared/vehicles.lua via',
    '// scripts/port-qb-shared.mjs. Drop-in for `QBCore.Shared.Vehicles`',
    '// consumers (qb-garages, qb-vehicleshop, qb-vehiclekeys, etc.).',
    '//',
    '// Upstream keys vehicles by `[`model`]` (Lua backtick = GetHashKey',
    "// at compile time). We key by the plain `model` string here; the",
    '// Phase-2 server/client wiring will build a hash-keyed map at',
    '// module load via GetHashKey() so existing hash-indexed callers',
    '// keep working.',
    '',
    'export interface Vehicle {',
    '  model: string;',
    '  name: string;',
    '  brand: string;',
    '  price: number;',
    "  category: string;",
    "  hash?: number;",
    "  type?: string;",
    "  shop?: string | string[];",
    '  [key: string]: unknown;',
    '}',
    '',
    'export const Vehicles: Record<string, Vehicle> = {',
  ].join('\n');
  const footer = '};\n';
  fs.writeFileSync(
    path.join(outDir, 'vehicles.ts'),
    generateTsFile(body, header, footer, { keyField: 'model' }),
    'utf8'
  );
  console.log('✓ vehicles.ts written');
}

console.log('Done.');
