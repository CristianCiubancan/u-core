// Audit: for each plugin, find every t('ui.<key>') reference in
// Page.tsx and check that the key exists in all 15 locale files.
// Reports any missing keys so we can confirm the i18n surface is
// genuinely complete rather than just claimed.

import fs from 'node:fs';
import path from 'node:path';

const repo = path.resolve(import.meta.dirname, '..');
const plugins = ['qb-multicharacter', 'qb-spawn'];
const expectedLocales = [
  'ar', 'cs', 'de', 'en', 'es', 'fi', 'fr', 'it', 'ja', 'nl',
  'pt', 'pt-br', 'sv', 'tr', 'vi',
];

let issues = 0;

for (const plugin of plugins) {
  const dir = path.join(repo, `src/plugins/[qb]/${plugin}`);
  const page = fs.readFileSync(path.join(dir, 'html/Page.tsx'), 'utf8');

  // Extract every `t('ui.something')` or `t("ui.something")` call.
  const used = new Set();
  for (const m of page.matchAll(/t\(['"](ui\.[a-z_]+)['"]/g)) {
    used.add(m[1].slice(3));
  }

  const localeFiles = fs.readdirSync(path.join(dir, 'translations'))
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace('.json', ''))
    .sort();

  console.log(`\n=== ${plugin} ===`);
  console.log(`  i18n keys referenced in Page.tsx: ${used.size}`);
  console.log(`  locale files present: ${localeFiles.length} (${localeFiles.join(', ')})`);

  const missingLocales = expectedLocales.filter((l) => !localeFiles.includes(l));
  if (missingLocales.length > 0) {
    console.log(`  ❌ MISSING LOCALES: ${missingLocales.join(', ')}`);
    issues++;
  }
  const extraLocales = localeFiles.filter((l) => !expectedLocales.includes(l));
  if (extraLocales.length > 0) {
    console.log(`  ⚠ EXTRA LOCALES: ${extraLocales.join(', ')}`);
    issues++;
  }

  for (const lng of localeFiles) {
    const json = JSON.parse(
      fs.readFileSync(path.join(dir, 'translations', `${lng}.json`), 'utf8')
    );
    const ui = json.ui ?? {};
    const missing = [...used].filter((k) => !(k in ui));
    if (missing.length > 0) {
      console.log(`  ❌ ${lng}.json missing ${missing.length} keys: ${missing.join(', ')}`);
      issues++;
    }
  }

  if (issues === 0) {
    console.log(`  ✓ all ${used.size} keys present in all ${localeFiles.length} locales`);
  }
}

if (issues > 0) {
  console.log(`\nFound ${issues} issue(s).`);
  process.exit(1);
}
console.log('\nFully internationalized — no missing keys, no extra/missing locales.');
