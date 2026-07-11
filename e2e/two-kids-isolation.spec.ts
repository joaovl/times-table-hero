import { test, expect } from '@playwright/test';

// Verifies that a parent with TWO kids gets no mixed results: each kid's reward
// rules are stored and shown independently, an all-kids rule stays separate, and
// deleting one kid does not touch the other. Runs against the real backend.
test.describe.configure({ mode: 'serial' });

const email = `e2e2_${Date.now()}@example.com`;
const password = 'longenough';

async function signUp(page) {
  await page.goto('/parent');
  await page.getByRole('button', { name: 'Create an account' }).click();
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign up' }).click();
  await expect(page.getByText('Signed in as')).toBeVisible();
}

async function addKid(page, name: string) {
  await page.goto('/parent/kids');
  await page.getByLabel('Name').fill(name);
  await page.getByRole('button', { name: 'Add kid' }).click();
  await expect(page.getByText(name, { exact: true })).toBeVisible();
}

async function setDailyReward(page, scopeLabel: string, reward: string) {
  await page.getByLabel('Rules apply to').selectOption({ label: scopeLabel });
  await page.getByLabel('Daily reward').fill(reward);
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Saved.')).toBeVisible();
}

test('two kids keep separate reward rules with no overlap', async ({ page }) => {
  await signUp(page);
  await addKid(page, 'Sam');
  await addKid(page, 'Alex');

  // Give each kid a distinct daily reward, plus a distinct all-kids default.
  await page.goto('/parent/rewards');
  await expect(page.getByRole('heading', { name: 'Reward settings' })).toBeVisible();
  await setDailyReward(page, 'Sam', 'Sam-candy');
  await setDailyReward(page, 'Alex', 'Alex-sticker');
  await setDailyReward(page, 'All kids', 'everyone-default');

  // Reload to force a fresh read from D1 (no client cache), then check that each
  // scope shows ONLY its own value.
  await page.reload();
  await page.getByLabel('Rules apply to').selectOption({ label: 'Sam' });
  await expect(page.getByLabel('Daily reward')).toHaveValue('Sam-candy');

  await page.getByLabel('Rules apply to').selectOption({ label: 'Alex' });
  await expect(page.getByLabel('Daily reward')).toHaveValue('Alex-sticker');

  await page.getByLabel('Rules apply to').selectOption({ label: 'All kids' });
  await expect(page.getByLabel('Daily reward')).toHaveValue('everyone-default');

  // Switching back and forth must not bleed values between kids.
  await page.getByLabel('Rules apply to').selectOption({ label: 'Sam' });
  await expect(page.getByLabel('Daily reward')).toHaveValue('Sam-candy');
  await page.getByLabel('Rules apply to').selectOption({ label: 'Alex' });
  await expect(page.getByLabel('Daily reward')).toHaveValue('Alex-sticker');

  // Deleting Sam must not affect Alex's rule.
  await page.goto('/parent/kids');
  await page.getByRole('button', { name: 'Remove Sam' }).click();
  await expect(page.getByText('Sam', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Alex', { exact: true })).toBeVisible();

  await page.goto('/parent/rewards');
  await page.reload();
  // Sam is gone from the scope options; Alex's rule is intact.
  await expect(page.getByRole('option', { name: 'Sam' })).toHaveCount(0);
  await page.getByLabel('Rules apply to').selectOption({ label: 'Alex' });
  await expect(page.getByLabel('Daily reward')).toHaveValue('Alex-sticker');
});
