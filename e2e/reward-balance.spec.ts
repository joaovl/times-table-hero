import { test, expect } from '@playwright/test';

// Proves the proportional "TV-hours" reward end to end in a real browser:
// configure a balance rule, log a few days of practice (incl. a skipped day)
// via the real API, then watch the dashboard compute the balance:
//   3 days ago  20 min @100%  -> +1
//   2 days ago  (no practice)  -> -1  (take-away)
//   1 day  ago  60 min @100%  -> +3
//   => balance = 3 hours of TV
test.describe.configure({ mode: 'serial' });

const email = `e2eb_${Date.now()}@example.com`;
const password = 'longenough';

// A given number of UTC days ago at 10:00, so each lands on a distinct local day.
function daysAgo(n: number): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - n, 10, 0, 0));
}
function session(id: string, start: Date, durationSec: number) {
  return {
    id, startedAt: start.toISOString(), endedAt: new Date(start.getTime() + durationSec * 1000).toISOString(),
    durationSec, module: 'times-tables', correct: 10, total: 10, topics: [] as string[],
  };
}

test('TV-hours balance is computed live in the dashboard', async ({ page }) => {
  // Sign up and add a kid.
  await page.goto('/parent');
  await page.getByRole('button', { name: 'Create an account' }).click();
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByLabel('Family PIN').fill('123456');
  await page.getByRole('button', { name: 'Sign up' }).click();
  await expect(page.getByText('Signed in as')).toBeVisible();

  await page.goto('/parent/kids');
  await page.getByLabel('Name').fill('Mia');
  await page.getByLabel('PIN', { exact: true }).fill('222333');
  await page.getByRole('button', { name: 'Add kid' }).click();
  await expect(page.getByText('Mia', { exact: true })).toBeVisible();

  // Configure the earned-balance (TV-hours) reward via the real UI. The defaults
  // are exactly 20 min/unit, 10 exercises/unit, +1 per unit, -1 penalty,
  // "hours of TV" — so switching the reward type and saving is enough.
  await page.goto('/parent/rewards');
  await page.getByLabel('Reward type').selectOption('balance');
  await expect(page.getByLabel('Reward unit (what she earns)')).toHaveValue('hours of TV');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Saved.')).toBeVisible();

  // Log practice through the real API (simulates what the modules will do).
  const token = await page.evaluate(() => localStorage.getItem('tth_token'));
  const headers = { Authorization: `Bearer ${token}`, 'content-type': 'application/json' };
  const kidsRes = await page.request.get('/api/kids', { headers });
  const kidId = (await kidsRes.json()).kids[0].id as string;

  const post = await page.request.post('/api/sessions', {
    headers,
    data: {
      kidId,
      sessions: [
        // Unique ids per run: practice_sessions.id is a global PK, so reused ids
        // would be dropped by INSERT OR IGNORE on repeat runs.
        session(`${email}-a`, daysAgo(3), 1200), // 20 min -> +1
        // 2 days ago: nothing logged -> missed -> -1
        session(`${email}-c`, daysAgo(1), 3600), // 60 min -> +3
      ],
    },
  });
  expect(post.status()).toBe(201);

  // The dashboard computes 1 - 1 + 3 = 3 hours of TV.
  await page.goto('/parent/dashboard');
  await expect(page.getByRole('heading', { name: 'Progress & rewards' })).toBeVisible();
  await expect(page.getByText(/\b3 hours of TV\b/)).toBeVisible();
});
