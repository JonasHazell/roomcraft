import { test, expect } from '@playwright/test';

/**
 * A `localStorage.setItem` failure (quota exceeded, Safari Private Browsing)
 * must not crash the app — the edit stays in memory and a calm, dismissible
 * notice appears instead (#350). Runs in both `desktop` and `mobile`.
 */

test.beforeEach(async ({ page }) => {
  // Make every setItem call throw, simulating a full quota / private browsing,
  // before the app's first script runs.
  await page.addInitScript(() => {
    window.localStorage.setItem = () => {
      throw new Error('QuotaExceededError');
    };
  });
  await page.goto('/');
});

test('a failed save shows a dismissible notice instead of crashing the app', async ({ page }) => {
  await page.getByRole('button', { name: /create a room/i }).click();
  await page.getByRole('button', { name: /^bedroom/i }).click();

  // The edit (creating/drawing the room) went through in memory even though it
  // couldn't be saved — no crash to the error boundary.
  await expect(page.getByRole('heading', { name: 'Something went wrong' })).toHaveCount(0);
  const banner = page.locator('.save-error-banner');
  await expect(banner).toBeVisible();
  await expect(banner.getByText(/aren.t saving/i)).toBeVisible();

  await banner.getByRole('button', { name: 'Dismiss' }).click();
  await expect(banner).toBeHidden();
});
