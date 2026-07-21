import { test, expect } from './fixtures';

// Real-stack journey for #15 (kid <-> parent linking): a parent signs up with a
// family PIN and creates a kid with their own PIN; then, logged out (a "kid's
// device"), the device is paired via email + family PIN, and the kid signs in
// from "Who's playing?" — wrong PIN rejected, right PIN lands in the app with a
// kid session token stored. Nothing here is mocked.
test.describe.configure({ mode: 'serial' });

const email = `e2ek_${Date.now()}@example.com`;
const password = 'longenough';
const FAMILY_PIN = '135790';
const KID_PIN = '246802';

test('parent sets up family + kid PINs; kid pairs the device and signs in', async ({ page }) => {
  // 1. Parent signs up (family PIN required) and adds a kid with a PIN.
  await page.goto('/parent');
  await page.getByRole('button', { name: 'Create an account' }).click();
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByLabel('Family PIN').fill(FAMILY_PIN);
  await page.getByRole('button', { name: 'Sign up' }).click();
  await expect(page.getByText('Signed in as')).toBeVisible();

  await page.goto('/parent/kids');
  await page.getByLabel('Name').fill('Ada');
  await page.getByLabel('PIN', { exact: true }).fill(KID_PIN);
  await page.getByRole('button', { name: 'Add kid' }).click();
  await expect(page.getByText('Ada', { exact: true })).toBeVisible();

  // 2. Log out — from here on this behaves like the kid's own device.
  await page.goto('/parent');
  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page.getByRole('heading', { name: 'Parent login' })).toBeVisible();

  // 3. "Who's playing?" without a paired device points to device setup.
  await page.goto('/whos-playing');
  await expect(page.getByText('This device isn’t set up yet.')).toBeVisible();
  await page.getByRole('link', { name: 'Set up this device' }).click();

  // 4. Pair the device with the parent email + family PIN (Mode B).
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Family PIN').fill(FAMILY_PIN);
  await page.getByRole('button', { name: 'Pair this device' }).click();
  await expect(page.getByRole('heading', { name: 'This device is paired' })).toBeVisible();

  // 5. The kid appears on "Who's playing?".
  await page.getByRole('link', { name: 'Who’s playing?' }).click();
  await page.getByRole('button', { name: 'Play as Ada' }).click();
  await expect(page.getByText('Hi Ada! Enter your PIN.')).toBeVisible();

  // 6. Wrong PIN is rejected with a friendly message; no session is created.
  await page.getByLabel('PIN', { exact: true }).fill('000000');
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText(/didn’t match/);
  expect(await page.evaluate(() => localStorage.getItem('tth_kid_token'))).toBeNull();

  // 7. The right PIN signs Ada in and lands in the app with a kid session.
  await page.getByLabel('PIN', { exact: true }).fill(KID_PIN);
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  expect(await page.evaluate(() => localStorage.getItem('tth_kid_token'))).toBeTruthy();
  const current = await page.evaluate(() => localStorage.getItem('tth_current_kid'));
  expect(JSON.parse(current!).name).toBe('Ada');
});
