import { test, expect } from '@playwright/test';

// Real-stack browser coverage for the two new parent-area UIs against
// wrangler pages dev + D1: the times-table focus picker (must round-trip
// through Save -> D1 -> reload) and the player-linking screen (device player
// -> cloud kid, persisted in localStorage). Nothing here is mocked.
test.describe.configure({ mode: 'serial' });

const email = `e2e_lf_${Date.now()}@example.com`;
const password = 'longenough';

test('focus picker persists through save + reload, and a player links to a kid', async ({ page }) => {
  // Seed one device-local player before the app boots.
  await page.addInitScript(() => {
    localStorage.setItem('maths-challenge-users', JSON.stringify([
      { id: 'p1', name: 'Sammy', color: 'blue', icon: 'star', createdAt: new Date().toISOString() },
    ]));
  });

  // Sign up.
  await page.goto('/parent');
  await page.getByRole('button', { name: 'Create an account' }).click();
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByLabel('Family PIN').fill('123456');
  await page.getByRole('button', { name: 'Sign up' }).click();
  await expect(page.getByText('Signed in as')).toBeVisible();

  // Add a kid.
  await page.getByRole('link', { name: 'Manage kids' }).click();
  await page.getByLabel('Name').fill('Sam');
  await page.getByLabel('PIN', { exact: true }).fill('222333');
  await page.getByRole('button', { name: 'Add kid' }).click();
  await expect(page.getByText('Sam')).toBeVisible();

  // Focus picker: turn on the 3 times table, save, reload -> still on.
  await page.goto('/parent/rewards');
  await expect(page.getByRole('heading', { name: 'Reward settings' })).toBeVisible();
  const three = page.getByRole('button', { name: 'Focus on the 3 times table' });
  await expect(three).toHaveAttribute('aria-pressed', 'false');
  await three.click();
  await expect(three).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Saved.')).toBeVisible();

  await page.reload();
  await expect(page.getByRole('button', { name: 'Focus on the 3 times table' }))
    .toHaveAttribute('aria-pressed', 'true');
  // A table we never picked stays off.
  await expect(page.getByRole('button', { name: 'Focus on the 7 times table' }))
    .toHaveAttribute('aria-pressed', 'false');

  // Linking screen: link the local player "Sammy" to the cloud kid "Sam".
  await page.goto('/parent/link');
  await expect(page.getByRole('heading', { name: 'Link players to your kids' })).toBeVisible();
  const select = page.getByLabel('Link Sammy to a kid');
  await select.selectOption({ label: 'Sam' });

  // The link is durable across a reload (stored in localStorage tth_kid_links).
  await page.reload();
  await expect(page.getByLabel('Link Sammy to a kid')).toHaveValue(/.+/); // a kid id, not ""
  const linked = await page.evaluate(() => localStorage.getItem('tth_kid_links'));
  expect(linked).toContain('p1');
});
