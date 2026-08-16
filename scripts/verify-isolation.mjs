// Proves the public web bundle carries no admin code.
//
// The architecture review flagged that admin.tsx shipped to every visitor. The
// monorepo split fixed that, and this script keeps it fixed: it fails the build
// if any admin-only marker turns up in the public bundle.
//
// Markers are string literals, not identifiers, because minification renames
// identifiers but leaves strings intact. Each one appears only in admin code.
//
// Usage:
//   npm run build:public && npm run build:admin && npm run verify:isolation

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const PUBLIC_DIST = path.join(ROOT, 'apps/public/dist');
const ADMIN_DIST = path.join(ROOT, 'apps/admin/dist');

const MARKERS = [
  'id, full_name, role, created_at, is_blocked',
  'id, venue_id, author_name, rating, comment, created_at, venue:venues (name)',
];

function readBundles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    for (const e of fs.readdirSync(cur, { withFileTypes: true })) {
      const p = path.join(cur, e.name);
      if (e.isDirectory()) stack.push(p);
      else if (/\.(js|html|map)$/.test(e.name)) out.push(p);
    }
  }
  return out;
}

function findMarkers(dir) {
  const hits = new Map();
  for (const file of readBundles(dir)) {
    const src = fs.readFileSync(file, 'utf8');
    for (const m of MARKERS) {
      if (src.includes(m)) {
        if (!hits.has(m)) hits.set(m, []);
        hits.get(m).push(path.relative(ROOT, file));
      }
    }
  }
  return hits;
}

let failed = false;

if (!fs.existsSync(PUBLIC_DIST)) {
  console.error(`FAIL: no public bundle at ${path.relative(ROOT, PUBLIC_DIST)}. Run "npm run build:public" first.`);
  process.exit(1);
}

// The real assertion: none of these may appear in the public bundle.
const leaked = findMarkers(PUBLIC_DIST);
if (leaked.size > 0) {
  failed = true;
  console.error('FAIL: admin code found in the PUBLIC bundle.\n');
  for (const [marker, files] of leaked) {
    console.error(`  marker: ${marker}`);
    for (const f of files) console.error(`     in: ${f}`);
  }
  console.error('\nAdmin-only reads and writes belong in apps/admin/src/lib/admin.ts,');
  console.error('never in packages/shared or apps/public.');
} else {
  console.log(`PASS: none of the ${MARKERS.length} admin markers appear in the public bundle.`);
}

// Positive control. If the admin bundle does not contain the markers either,
// then the markers have gone stale and the check above proves nothing.
if (fs.existsSync(ADMIN_DIST)) {
  const present = findMarkers(ADMIN_DIST);
  const missing = MARKERS.filter((m) => !present.has(m));
  if (missing.length > 0) {
    failed = true;
    console.error('\nFAIL: markers missing from the ADMIN bundle, so they no longer prove anything.');
    for (const m of missing) console.error(`  stale marker: ${m}`);
    console.error('\nUpdate MARKERS in scripts/verify-isolation.mjs to match the current admin queries.');
  } else {
    console.log(`PASS: all ${MARKERS.length} markers present in the admin bundle, so the check is live.`);
  }
} else {
  console.warn('\nWARN: no admin bundle found, skipping the positive control.');
  console.warn('Run "npm run build:admin" for the full check.');
}

process.exit(failed ? 1 : 0);
