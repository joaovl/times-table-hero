// Reports the UNION of unit + e2e line coverage: a line counts as covered if
// EITHER the unit suite or the browser e2e run exercised it. Because the two
// use different instrumenters (their per-file statement maps differ slightly,
// which nyc can't line-merge), we combine at the file level using each file's
// higher covered-line count — a valid lower bound on the true union.
//
// Reads coverage/unit/coverage-summary.json and coverage/e2e-only/coverage-summary.json.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const load = (p) => {
  const f = path.join(ROOT, p);
  if (!fs.existsSync(f)) return null;
  return JSON.parse(fs.readFileSync(f, 'utf8'));
};

const unit = load('coverage/unit/coverage-summary.json');
const e2e = load('coverage/e2e-only/coverage-summary.json');
if (!unit || !e2e) {
  console.error('Missing coverage summaries — run coverage:all first.');
  process.exit(1);
}

const norm = (k) => k.split('\\').join('/');
const files = new Set([...Object.keys(unit), ...Object.keys(e2e)].filter((k) => k !== 'total').map(norm));

const areaOf = (rel) =>
  /modules\/[^/]+\/logic\.ts$/.test(rel) ? 'module logic.ts'
  : /Play\.tsx$/.test(rel) ? 'module *Play.tsx (UI)'
  : /Setup\.tsx$/.test(rel) ? 'module *Setup.tsx (UI)'
  : /^modules\//.test(rel) ? 'module other'
  : /^pages\//.test(rel) ? 'pages (UI)'
  : /^lib\//.test(rel) ? 'lib'
  : /^components\//.test(rel) ? 'components (UI)'
  : 'other';

const byArea = {};
let uCov = 0, uTot = 0;
const index = (obj) => {
  const m = {};
  for (const [k, v] of Object.entries(obj)) if (k !== 'total') m[norm(k)] = v;
  return m;
};
const U = index(unit), E = index(e2e);

for (const f of files) {
  const u = U[f]?.lines ?? { covered: 0, total: 0 };
  const e = E[f]?.lines ?? { covered: 0, total: 0 };
  const total = Math.max(u.total, e.total);
  const covered = Math.min(total, Math.max(u.covered, e.covered)); // union lower bound
  uCov += covered; uTot += total;
  const rel = f.split('/src/')[1] || f;
  const a = areaOf(rel);
  (byArea[a] ??= { cov: 0, tot: 0 });
  byArea[a].cov += covered; byArea[a].tot += total;
}

const pct = (c, t) => (t ? (100 * c / t).toFixed(1) : 'n/a');
console.log('\n=== UNION coverage (covered by unit OR browser e2e) ===');
console.log(`  Lines: ${pct(uCov, uTot)}%  (${uCov}/${uTot})\n`);
console.log('  By area:');
for (const [a, x] of Object.entries(byArea).sort((p, q) => q[1].tot - p[1].tot)) {
  console.log('    ' + String(pct(x.cov, x.tot)).padStart(5) + '%  ' + String(x.cov + '/' + x.tot).padStart(11) + '  ' + a);
}
