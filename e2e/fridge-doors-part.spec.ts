import { test, expect } from '@playwright/test';

/**
 * Every other "box with doors" kind (Wardrobe, Bookshelf) splits the doors into
 * their own material part; the Fridge was the one outlier despite modelling a
 * real, visible door face (#354). Runs in both `desktop` and `mobile`.
 */

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('the fridge has a separate Doors colour control alongside Body', async ({ page }) => {
  await page.getByRole('button', { name: /create a room/i }).click();
  await page.getByRole('button', { name: /^bedroom/i }).click();
  await page.getByRole('button', { name: /furnish this room/i }).click();

  await page.getByRole('button', { name: 'Add furniture' }).click();
  await page.getByRole('button', { name: 'Fridge', exact: true }).click();

  const dialog = page.getByRole('dialog', { name: 'Furniture settings' });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('input.color-field-chip[aria-label="Body"]')).toBeVisible();
  await expect(dialog.locator('input.color-field-chip[aria-label="Doors"]')).toBeVisible();
});
