// After unit coverage (coverage/unit/) and e2e collection (.nyc_output/e2e-*.json)
// both exist, build the e2e-only report and print the UNION of the two.
// Unit and e2e use different instrumenters whose per-file maps differ, so nyc
// can't line-merge them; we union at the file level instead (coverage-union).
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const run = (cmd) => execSync(cmd, { cwd: ROOT, stdio: 'inherit' });

console.log('=== e2e-only report (from .nyc_output) ===');
run(
  'npx nyc report --temp-dir=.nyc_output --report-dir=coverage/e2e-only ' +
    '--reporter=text-summary --reporter=html --reporter=json-summary',
);

run('node scripts/coverage-union.cjs');
console.log('\nReports: coverage/unit/index.html, coverage/e2e-only/index.html');
