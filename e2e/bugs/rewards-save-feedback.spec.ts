import { test, expect } from '@playwright/test';

// Bug #5: saving reward rules with a blank balance unit must give a specific,
// actionable message (not an opaque "Could not save."), and succeed once fixed.
test.describe.configure({ mode: 'serial' });

const email = `e2e_rewards_${Date.now()}@example.com`;
const password = 'longenough';

test('blank reward unit gives a specific message; filling it saves', async ({ page }) => {
  // Sign up.
  await page.goto('/parent');
  await page.getByRole('button', { name: 'Create an account' }).click();
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign up' }).click();
  await expect(page.getByText('Signed in as')).toBeVisible();

  // Reward settings -> balance mode -> clear the unit -> Save.
  await page.goto('/parent/rewards');
  await expect(page.getByRole('heading', { name: 'Reward settings' })).toBeVisible();
  await page.getByLabel('Reward type').selectOption('balance');
  await page.getByLabel('Reward unit (what she earns)').fill('');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText(/please enter a reward unit/i)).toBeVisible();
  await expect(page.getByText('Saved.')).toHaveCount(0);

  // Fill the unit -> Save succeeds.
  await page.getByLabel('Reward unit (what she earns)').fill('hours of TV');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Saved.')).toBeVisible();
});

// Bug #14: the reward settings page must offer a way back to the parent area.
test('reward settings has a back link to the parent area', async ({ page }) => {
  await page.goto('/parent');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page.getByText('Signed in as')).toBeVisible();

  await page.goto('/parent/rewards');
  await page.getByRole('link', { name: /parent area/i }).click();
  await expect(page).toHaveURL(/\/parent$/);
  await expect(page.getByRole('heading', { name: 'Parent area' })).toBeVisible();
});
