import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
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

// 2. Guard non-string values, empty values, and verify interpolation vars
const IDENTICAL_ALLOWLIST = new Set([
  'dashboard.range7d',
  'dashboard.range30d'
]);

const varRegex = /\{\{\s*(\w+)\s*\}\}/g;
for (const [k, val] of Object.entries(enFlat)) {
  if (typeof val !== 'string') {
    console.error(`❌ Non-string value in en.json for "${k}" (type: ${typeof val})`);
    errors++;
    continue;
  }
  if (!val.trim()) {
    console.error(`❌ Empty string value in en.json for "${k}"`);
    errors++;
  }
  const bnVal = bnFlat[k];
  if (bnVal !== undefined) {
    if (typeof bnVal !== 'string') {
      console.error(`❌ Non-string value in bn.json for "${k}" (type: ${typeof bnVal})`);
      errors++;
      continue;
    }
    if (!bnVal.trim()) {
      console.error(`❌ Empty string value in bn.json for "${k}"`);
      errors++;
    }
    if (bnVal === val && !IDENTICAL_ALLOWLIST.has(k)) {
      console.warn(`⚠️ Warning: bn value equals en value for "${k}": "${val}"`);
      warnings++;
    }
    const enVars = [...(val.matchAll(varRegex) || [])].map(m => m[1]).sort();
    const bnVars = [...(bnVal.matchAll(varRegex) || [])].map(m => m[1]).sort();
    if (JSON.stringify(enVars) !== JSON.stringify(bnVars)) {
      console.error(`❌ Interpolation variable mismatch for "${k}": EN=[${enVars.join(', ')}] vs BN=[${bnVars.join(', ')}]`);
      errors++;
    }
  }
}

// 3. Scan client code for t('...') and translateError(..., '...') calls
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
const translateErrorRegex = /\btranslateError\([^,]+,\s*['"]([a-zA-Z0-9_.]+)['"]\)/g;

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

  while ((match = translateErrorRegex.exec(content)) !== null) {
    const fallbackKey = match[1];
    usedKeys.add(fallbackKey);
    if (!(fallbackKey in enFlat)) {
      console.error(`❌ translateError fallback key '${fallbackKey}' used in ${path.relative(rootDir, file)} does NOT exist in dictionary!`);
      errors++;
    }
  }
}

// 4. Check dynamic key sets (metrics.* x4, zones.* x3, common.* statuses)
console.log('Checking dynamic key sets (metrics.* x4, zones.* x3, common.* statuses)...');
const dynamicKeySets = [
  // metrics.* x4
  'metrics.ammonia',
  'metrics.methane',
  'metrics.humidity',
  'metrics.temperature',
  // zones.* x3
  'zones.safe',
  'zones.warning',
  'zones.danger',
  // common.* status keys
  'common.approved',
  'common.pending',
  'common.rejected',
  'common.unlinked',
  'common.active',
  'common.removed',
  'common.online',
  'common.offline'
];

for (const k of dynamicKeySets) {
  usedKeys.add(k);
  if (!(k in enFlat)) {
    console.error(`❌ Dynamic key "${k}" is missing in en.json!`);
    errors++;
  }
  if (!(k in bnFlat)) {
    console.error(`❌ Dynamic key "${k}" is missing in bn.json!`);
    errors++;
  }
}

// 5. Check LOCATIONS divisions and districts coverage
const locationsFile = path.resolve(rootDir, '..', 'server', 'src', 'utils', 'locations.js');
if (fs.existsSync(locationsFile)) {
  const { LOCATIONS } = require(locationsFile);
  console.log('Checking LOCATIONS division and district coverage...');
  for (const div of Object.keys(LOCATIONS)) {
    const divKey = `locations.divisions.${div}`;
    usedKeys.add(divKey);
    if (!(divKey in enFlat)) {
      console.error(`❌ Division "${div}" missing "${divKey}" in en.json!`);
      errors++;
    }
    if (!(divKey in bnFlat)) {
      console.error(`❌ Division "${div}" missing "${divKey}" in bn.json!`);
      errors++;
    }
    for (const dist of LOCATIONS[div]) {
      const distKey = `locations.districts.${dist}`;
      usedKeys.add(distKey);
      if (!(distKey in enFlat)) {
        console.error(`❌ District "${dist}" missing "${distKey}" in en.json!`);
        errors++;
      }
      if (!(distKey in bnFlat)) {
        console.error(`❌ District "${dist}" missing "${distKey}" in bn.json!`);
        errors++;
      }
    }
  }
} else {
  console.warn('⚠️ Warning: locations.js not found at ../server/src/utils/locations.js');
  warnings++;
}

// 6. Check every server error code has an errors.* key
const serverDir = path.resolve(rootDir, '..', 'server', 'src');
if (fs.existsSync(serverDir)) {
  const serverFiles = walk(serverDir);
  const serverCodes = new Set([
    'BAD_REQUEST',
    'UNAUTHORIZED',
    'FORBIDDEN',
    'NOT_FOUND',
    'CONFLICT',
    'PAYLOAD_TOO_LARGE',
    'RATE_LIMITED',
    'INTERNAL_ERROR',
    'REQUEST_ERROR'
  ]);

  // Match code as last string argument in createError(...), respondError(...), or createAuthError(...)
  const fnErrorRegex = /(?:createError|respondError|createAuthError)\s*\([^)]*,\s*['"]([A-Z][A-Z0-9_]+)['"]\s*\)/g;
  const inlineCodeRegex = /code:\s*['"]([A-Z0-9_]+)['"]/g;

  for (const sFile of serverFiles) {
    const sContent = fs.readFileSync(sFile, 'utf8');
    let sMatch;
    while ((sMatch = fnErrorRegex.exec(sContent)) !== null) {
      serverCodes.add(sMatch[1]);
    }
    while ((sMatch = inlineCodeRegex.exec(sContent)) !== null) {
      serverCodes.add(sMatch[1]);
    }
  }

  console.log(`Checking server error code coverage (${serverCodes.size} server codes)...`);
  for (const code of serverCodes) {
    const expectedKey = `errors.${code}`;
    if (!(expectedKey in enFlat)) {
      console.error(`❌ Server error code "${code}" is missing "${expectedKey}" in en.json!`);
      errors++;
    }
    if (!(expectedKey in bnFlat)) {
      console.error(`❌ Server error code "${code}" is missing "${expectedKey}" in bn.json!`);
      errors++;
    }
  }
} else {
  console.warn('⚠️ Warning: ../server/src directory not found; skipping server error code scan.');
  warnings++;
}

// 5. Report unused keys
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
  console.log('✅ All dictionary, fallback, and server code coverage i18n checks passed!');
}
