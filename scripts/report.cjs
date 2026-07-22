// One command to produce reports/test-report.html — a browsable report of
// every test (title + pass/fail/skip) across the unit suite and the browser
// (e2e) suite. Run: npm run report
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORTS = path.join(ROOT, 'reports');
const run = (cmd, env = {}) => execSync(cmd, { cwd: ROOT, stdio: 'inherit', env: { ...process.env, ...env } });

function freePort(port) {
  try {
    const out = execSync(`netstat -ano | findstr :${port}`, { cwd: ROOT }).toString();
    for (const pid of new Set(out.split(/\r?\n/).filter(Boolean).map((l) => l.trim().split(/\s+/).pop()).filter((p) => /^\d+$/.test(p)))) {
      try { execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' }); } catch { /* gone */ }
    }
  } catch { /* nothing listening */ }
}

fs.mkdirSync(REPORTS, { recursive: true });

console.log('\n=== 1/3 unit tests (json) ===');
run('npx vitest run --reporter=json --outputFile=reports/unit-results.json');

console.log('\n=== 2/3 browser (e2e) tests (json) ===');
freePort(8788);
// retries absorb transient Windows socket flakes; CI=1 forces a fresh server.
run('npx playwright test --reporter=json --retries=2 --workers=3', {
  PLAYWRIGHT_JSON_OUTPUT_NAME: path.join(REPORTS, 'e2e-results.json'),
  CI: '1',
});

console.log('\n=== 3/3 build report ===');
run('node scripts/gen-test-report.cjs reports/unit-results.json reports/e2e-results.json reports/test-report.html');
console.log('\nOpen: reports/test-report.html');
