// Builds a single self-contained HTML test report (title + status per test)
// from the vitest and Playwright JSON result files. Usage:
//   node scripts/gen-test-report.cjs <unit-results.json> <e2e-results.json> <out.html>
const fs = require('fs');
const path = require('path');

const [, , unitPath, e2ePath, outPath] = process.argv;
const rows = [];

function normStatus(s) {
  if (s === 'passed' || s === 'expected') return 'passed';
  if (s === 'failed' || s === 'unexpected' || s === 'timedOut') return 'failed';
  return 'skipped';
}

// ---- vitest ----
if (unitPath && fs.existsSync(unitPath)) {
  const j = JSON.parse(fs.readFileSync(unitPath, 'utf8'));
  for (const tr of j.testResults || []) {
    const file = (tr.name || '').split(/[\\/]/).slice(-2).join('/');
    for (const a of tr.assertionResults || []) {
      rows.push({
        suite: file,
        title: [...(a.ancestorTitles || []), a.title].join(' › '),
        status: normStatus(a.status),
        ms: Math.round(a.duration || 0),
        source: 'unit',
      });
    }
  }
}

// ---- playwright (recursive: files -> describe suites -> specs) ----
function walkPw(suite, ancestors, file) {
  const f = suite.file || file;
  for (const spec of suite.specs || []) {
    const results = (spec.tests || []).flatMap((t) => t.results || []);
    let status = 'skipped';
    if (results.some((r) => normStatus(r.status) === 'passed') && spec.ok) status = 'passed';
    if (results.some((r) => normStatus(r.status) === 'failed')) status = 'failed';
    if (results.length && results.every((r) => r.status === 'skipped')) status = 'skipped';
    const ms = results.length ? Math.max(...results.map((r) => r.duration || 0)) : 0;
    rows.push({
      suite: f,
      title: [...ancestors, spec.title].filter(Boolean).join(' › '),
      status,
      ms: Math.round(ms),
      source: 'e2e',
    });
  }
  for (const child of suite.suites || []) walkPw(child, [...ancestors, child.title].filter(Boolean), f);
}
if (e2ePath && fs.existsSync(e2ePath)) {
  const j = JSON.parse(fs.readFileSync(e2ePath, 'utf8'));
  for (const s of j.suites || []) walkPw(s, [], s.file || s.title);
}

const summary = {
  total: rows.length,
  passed: rows.filter((r) => r.status === 'passed').length,
  failed: rows.filter((r) => r.status === 'failed').length,
  skipped: rows.filter((r) => r.status === 'skipped').length,
  unit: rows.filter((r) => r.source === 'unit').length,
  e2e: rows.filter((r) => r.source === 'e2e').length,
  generatedAt: new Date().toISOString(),
};

const template = fs.readFileSync(path.join(__dirname, 'test-report-template.html'), 'utf8');
const html = template.replace('/*__DATA__*/', () => JSON.stringify({ rows, summary }));
fs.writeFileSync(outPath, html);
console.log(
  `wrote ${outPath}: ${summary.total} tests (${summary.passed} passed, ${summary.failed} failed, ${summary.skipped} skipped; unit ${summary.unit}, e2e ${summary.e2e})`,
);
