import { test, expect } from '@playwright/test';

// Full real-stack journey in a real Chromium against wrangler pages dev + D1:
// sign up -> add a kid -> configure reward rules -> verify they persist across
// a page reload AND across logout + re-login. Nothing here is mocked.
test.describe.configure({ mode: 'serial' });

const email = `e2e_${Date.now()}@example.com`;
const password = 'longenough';

test('parent signs up, adds a kid, sets rewards, and everything persists', async ({ page }) => {
  // 1. Reach the parent area (unauthenticated -> login screen) and sign up.
  await page.goto('/parent');
  await expect(page.getByRole('heading', { name: 'Parent login' })).toBeVisible();
  await page.getByRole('button', { name: 'Create an account' }).click();
  await expect(page.getByRole('heading', { name: 'Create parent account' })).toBeVisible();
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign up' }).click();
  await expect(page.getByText('Signed in as')).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();

  // 2. Add a kid.
  await page.getByRole('link', { name: 'Manage kids' }).click();
  await expect(page).toHaveURL(/\/parent\/kids$/);
  await page.getByLabel('Name').fill('Sam');
  await page.getByRole('button', { name: 'Add kid' }).click();
  await expect(page.getByText('Sam')).toBeVisible();

  // 3. Configure the reward rules (the bribe area).
  await page.goto('/parent/rewards');
  await expect(page.getByRole('heading', { name: 'Reward settings' })).toBeVisible();
  await page.getByLabel('Daily reward').fill('2 stickers');
  await page.getByLabel('Successful days per week').fill('6');
  await page.getByLabel('Enable a bigger reward').check();
  await page.getByLabel('Bigger reward', { exact: true }).fill('a bike');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Saved.')).toBeVisible();

  // 4. Persist across a full page reload (re-fetched from D1).
  await page.reload();
  await expect(page.getByLabel('Daily reward')).toHaveValue('2 stickers');
  await expect(page.getByLabel('Successful days per week')).toHaveValue('6');
  await expect(page.getByLabel('Enable a bigger reward')).toBeChecked();
  await expect(page.getByLabel('Bigger reward', { exact: true })).toHaveValue('a bike');

  // 5. Log out.
  await page.goto('/parent');
  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page.getByRole('heading', { name: 'Parent login' })).toBeVisible();

  // 6. Log back in; the kid and the rules are still there.
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page.getByText('Signed in as')).toBeVisible();

  await page.goto('/parent/kids');
  await expect(page.getByText('Sam')).toBeVisible();

  await page.goto('/parent/rewards');
  await expect(page.getByLabel('Daily reward')).toHaveValue('2 stickers');
  await expect(page.getByLabel('Bigger reward', { exact: true })).toHaveValue('a bike');
});

test('login rejects wrong credentials with a friendly message', async ({ page }) => {
  await page.goto('/parent');
  await page.getByLabel('Email').fill(email); // an email that DOES exist now
  await page.getByLabel('Password').fill('definitelywrong');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page.getByRole('alert')).toContainText(/incorrect/i);
  // still on the login screen, not signed in
  await expect(page.getByRole('heading', { name: 'Parent login' })).toBeVisible();
});
