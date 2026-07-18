import { test, expect } from '@playwright/test';

/**
 * Several furniture parts have a colour/material picker that visibly does
 * nothing whenever the option that draws that part in 3D is switched off — a
 * control with no effect isn't self-evident (#356). The picker now hides
 * while the companion option is off: TV bench, Bookshelf doors, Sink
 * pedestal. Runs in both `desktop` and `mobile`.
 */

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /create a room/i }).click();
  await page.getByRole('button', { name: /^bedroom/i }).click();
  await page.getByRole('button', { name: /furnish this room/i }).click();
});

async function openEditor(page: import('@playwright/test').Page, kind: string) {
  await page.getByRole('button', { name: 'Add furniture' }).click();
  await page.getByRole('button', { name: kind, exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Furniture settings' });
  await expect(dialog).toBeVisible();
  return dialog;
}

test('TV bench colour control hides when Media bench is switched off', async ({ page }) => {
  const dialog = await openEditor(page, 'TV');
  const benchColor = dialog.locator('input.color-field-chip[aria-label="Bench"]');
  await expect(benchColor).toBeVisible();

  await dialog.getByLabel('Media bench').click();
  await expect(benchColor).toHaveCount(0);
});

test('Bookshelf doors colour control appears once Cabinet doors is on', async ({ page }) => {
  const dialog = await openEditor(page, 'Bookshelf');
  const doorsColor = dialog.locator('input.color-field-chip[aria-label="Doors"]');
  // Bookshelf's "Cabinet doors" toggle defaults off.
  await expect(doorsColor).toHaveCount(0);

  await dialog.getByLabel('Cabinet doors').click();
  await expect(doorsColor).toBeVisible();
});

test('Sink pedestal colour control hides when Pedestal is switched off', async ({ page }) => {
  const dialog = await openEditor(page, 'Sink');
  const pedestalColor = dialog.locator('input.color-field-chip[aria-label="Pedestal"]');
  await expect(pedestalColor).toBeVisible();

  await dialog.getByRole('checkbox', { name: 'Pedestal' }).click();
  await expect(pedestalColor).toHaveCount(0);
});
