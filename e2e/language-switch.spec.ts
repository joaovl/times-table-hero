import { test, expect } from './fixtures';
import pt from '../src/lib/i18n/locales/pt.json' with { type: 'json' };

// The parent switches the device language: the UI flips instantly (no reload)
// and the choice persists across a reload. Assertions read the pt catalog so
// wording changes can't silently break this spec.
const ptTitle = (pt as Record<string, string>)['parent.home.title'];
const email = `e2ei_${Date.now()}@example.com`;

test('parent switches language: instant flip, persists across reload', async ({ page }) => {
  await page.goto('/parent');
  await page.getByRole('button', { name: 'Create an account' }).click();
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('longenough');
  await page.getByLabel('Family PIN').fill('123456');
  await page.getByRole('button', { name: 'Sign up' }).click();
  await expect(page.getByText('Signed in as')).toBeVisible();

  // Switch to Portuguese; the heading flips without a reload.
  await page.getByLabel('Language').selectOption('pt');
  await expect(page.getByRole('heading', { name: ptTitle })).toBeVisible();

  // Persists across reload.
  await page.reload();
  await expect(page.getByRole('heading', { name: ptTitle })).toBeVisible();

  // Back to English — the selector's aria-label is locale-stable by design.
  await page.getByLabel('Language').selectOption('en');
  await expect(page.getByRole('heading', { name: 'Parent area' })).toBeVisible();
});
