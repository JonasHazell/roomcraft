import { test, expect } from '@playwright/test';

/**
 * The furniture editor groups colour and material *per part* (a sofa's frame vs
 * its cushions) under a single "Colours & materials" section — instead of one
 * block listing every colour followed by a separate "Materials" block — so the
 * two decisions about a part sit side by side. This also removed the old
 * read-only "N cm to nearest piece" distance readout from the same panel.
 *
 * Runs in both the `desktop` and `mobile` projects (see playwright.config.ts).
 */

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('colour and material are grouped per part, with no distance readout', async ({ page }) => {
  // The flow mounts the 3D scene and opens the furniture dialog on top of it —
  // WebGL under mobile Chrome emulation is slower, so give it headroom.
  test.setTimeout(60_000);

  // Build a room from a template — fast, no manual wall-drawing needed.
  await page.getByRole('button', { name: /create a room/i }).click();
  await page.getByRole('button', { name: /^bedroom/i }).click();
  await page.getByRole('button', { name: /furnish this room/i }).click();

  // A sofa splits into two parts (frame, cushions) — picking it lands directly
  // in the live edit form the appearance controls live in.
  await page.getByRole('button', { name: 'Add furniture' }).click();
  await page.getByRole('button', { name: 'Sofa', exact: true }).click();

  const dialog = page.getByRole('dialog', { name: 'Furniture settings' });
  await expect(dialog).toBeVisible();

  // One combined section header — not the old separate "Colours" / "Materials"
  // blocks.
  await expect(dialog.getByText('Colours & materials', { exact: true })).toBeVisible();
  await expect(dialog.getByText('Colours', { exact: true })).toHaveCount(0);
  await expect(dialog.getByText('Materials', { exact: true })).toHaveCount(0);

  // Each part contributes a colour chip and a material picker: two parts → two
  // of each.
  await expect(dialog.locator('input.color-field-chip[aria-label="Frame"]')).toBeVisible();
  await expect(dialog.locator('input.color-field-chip[aria-label="Cushions"]')).toBeVisible();
  await expect(dialog.getByLabel('Material')).toHaveCount(2);

  // The distance readout is gone: even with a second piece in the room, no
  // "nearest piece" line appears in the editor.
  await page.getByRole('button', { name: 'OK', exact: true }).click();
  await page.getByRole('button', { name: 'Add furniture' }).click();
  await page.getByRole('button', { name: 'Chair', exact: true }).click();

  await expect(page.getByRole('dialog', { name: 'Furniture settings' })).toBeVisible();
  await expect(
    page.locator('.field-static').filter({ hasText: /nearest piece/i }),
  ).toHaveCount(0);
});
