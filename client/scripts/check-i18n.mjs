import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const enPath = path.join(rootDir, 'src', 'locales', 'en.json');
const bnPath = path.join(rootDir, 'src', 'locales', 'bn.json');

const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const bn = JSON.parse(fs.readFileSync(bnPath, 'utf8'));

let errors = 0;
let warnings = 0;

function flattenKeys(obj, prefix = '') {
  let keys = {};
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(keys, flattenKeys(v, full));
    } else {
      keys[full] = v;
    }
  }
  return keys;
}

const enFlat = flattenKeys(en);
const bnFlat = flattenKeys(bn);

console.log(`Checking i18n dictionaries: ${Object.keys(enFlat).length} keys in EN, ${Object.keys(bnFlat).length} keys in BN\n`);

// 1. Key parity
for (const k of Object.keys(enFlat)) {
  if (!(k in bnFlat)) {
    console.error(`❌ Key missing in bn.json: "${k}"`);
    errors++;
  }
}
for (const k of Object.keys(bnFlat)) {
  if (!(k in enFlat)) {
    console.error(`❌ Key missing in en.json: "${k}"`);
    errors++;
  }
}

// 2. Empty values & interpolation vars
const varRegex = /\{\{\s*(\w+)\s*\}\}/g;
for (const [k, val] of Object.entries(enFlat)) {
  if (typeof val !== 'string' || !val.trim()) {
    console.error(`❌ Empty or non-string value in en.json for "${k}"`);
    errors++;
  }
  const bnVal = bnFlat[k];
  if (bnVal !== undefined) {
    if (typeof bnVal !== 'string' || !bnVal.trim()) {
      console.error(`❌ Empty or non-string value in bn.json for "${k}"`);
      errors++;
    }
    const enVars = [...(val.matchAll(varRegex) || [])].map(m => m[1]).sort();
    const bnVars = [...(bnVal.matchAll(varRegex) || [])].map(m => m[1]).sort();
    if (JSON.stringify(enVars) !== JSON.stringify(bnVars)) {
      console.error(`❌ Interpolation variable mismatch for "${k}": EN=[${enVars.join(', ')}] vs BN=[${bnVars.join(', ')}]`);
      errors++;
    }
  }
}

// 3. Scan code for t('...') calls
function walk(dir) {
  let files = [];
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (item !== 'node_modules' && item !== 'dist' && item !== 'locales') {
        files = files.concat(walk(full));
      }
    } else if (item.endsWith('.jsx') || item.endsWith('.js')) {
      files.push(full);
    }
  }
  return files;
}

const srcFiles = walk(path.join(rootDir, 'src'));
const usedKeys = new Set();
const tCallRegex = /\bt\(\s*['"]([a-zA-Z0-9_.]+)['"]/g;

for (const file of srcFiles) {
  const content = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = tCallRegex.exec(content)) !== null) {
    const key = match[1];
    usedKeys.add(key);
    if (!(key in enFlat)) {
      console.error(`❌ t('${key}') used in ${path.relative(rootDir, file)} does NOT exist in dictionary!`);
      errors++;
    }
  }
}

// 4. Report unused keys
const unused = [];
for (const k of Object.keys(enFlat)) {
  // Ignore dynamic prefix keys (locations, errors, zones)
  if (k.startsWith('locations.') || k.startsWith('errors.') || k.startsWith('zones.')) {
    continue;
  }
  if (!usedKeys.has(k)) {
    unused.push(k);
  }
}

if (unused.length > 0) {
  console.warn(`⚠️ Warning: ${unused.length} dictionary keys may be unused:`);
  unused.forEach(k => console.warn(`   - ${k}`));
  warnings += unused.length;
}

console.log(`\ni18n check completed: ${errors} errors, ${warnings} warnings.`);
if (errors > 0) {
  process.exit(1);
} else {
  console.log('✅ All dictionary and source code i18n checks passed!');
}
