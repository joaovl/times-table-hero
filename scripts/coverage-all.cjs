// One-command merged coverage: unit (vitest/istanbul) + browser e2e
// (vite-plugin-istanbul, collected per-test) -> a single report in
// coverage/merged. Run: npm run coverage:all
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const run = (cmd, env = {}) =>
  execSync(cmd, { cwd: ROOT, stdio: 'inherit', env: { ...process.env, ...env } });

// Free port 8788 (Windows) so Playwright builds a FRESH instrumented server
// rather than reusing a stale, un-instrumented one.
function freePort(port) {
  try {
    const out = execSync(`netstat -ano | findstr :${port}`, { cwd: ROOT }).toString();
    const pids = new Set(
      out.split(/\r?\n/).filter(Boolean).map((l) => l.trim().split(/\s+/).pop()).filter((p) => /^\d+$/.test(p)),
    );
    for (const pid of pids) {
      try { execSync(`taskkill /PID ${pid} /F`, { cwd: ROOT, stdio: 'ignore' }); } catch { /* already gone */ }
    }
  } catch {
    // nothing listening — fine
  }
}

fs.rmSync(path.join(ROOT, '.nyc_output'), { recursive: true, force: true });
fs.mkdirSync(path.join(ROOT, '.nyc_output'), { recursive: true });

console.log('\n=== 1/3 unit coverage (vitest/istanbul) ===');
run('npm run coverage');

console.log('\n=== 2/3 browser e2e coverage (instrumented build) ===');
freePort(8788);
// CI=1 -> reuseExistingServer:false, so a fresh instrumented server is built.
run('npx playwright test --fully-parallel --workers=4', { COVERAGE: '1', CI: '1' });

console.log('\n=== 3/3 e2e-only report + union ===');
run('node scripts/coverage-merge.cjs');
