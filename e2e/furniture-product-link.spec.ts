import { test, expect } from '@playwright/test';

/**
 * Coverage for #351: a furniture piece can carry an optional link to the real,
 * purchasable product it stands for — the first step toward the vision's
 * "planning leads to purchase" catalogue model. Entering a link reveals the
 * price/retailer details and surfaces a "Buy" affordance in the dialog footer;
 * a piece with no link shows neither. See `FurnitureFields.tsx`
 * (`FurnitureProductFields`), `FurnitureDialog.tsx` (the Buy control) and
 * `lib/furnitureProduct.ts`.
 *
 * Runs in both the `desktop` and `mobile` projects (see playwright.config.ts).
 */

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('a product link surfaces a Buy affordance; no link shows none', async ({ page }) => {
  // The flow mounts the 3D scene and opens the furniture dialog on top of it.
  test.setTimeout(60_000);

  // Build a room from a template, then furnish it.
  await page.getByRole('button', { name: /create a room/i }).click();
  await page.getByRole('button', { name: /^bedroom/i }).click();
  await page.getByRole('button', { name: /furnish this room/i }).click();

  // Picking a kind lands directly in the live edit form the product fields live in.
  await page.getByRole('button', { name: 'Add furniture' }).click();
  await page.getByRole('button', { name: 'Sofa', exact: true }).click();

  const dialog = page.getByRole('dialog', { name: 'Furniture settings' });
  await expect(dialog).toBeVisible();

  // Fresh piece: no product link yet, so no Buy control and no price/retailer fields.
  const buy = dialog.getByRole('link', { name: /buy this piece/i });
  await expect(buy).toBeHidden();
  await expect(dialog.getByLabel('Price')).toBeHidden();

  // Enter a real product link — the price/retailer details now appear.
  await dialog.getByLabel('Product link').fill('https://example.com/comfy-sofa');
  await expect(dialog.getByLabel('Price')).toBeVisible();
  await dialog.getByLabel('Price').fill('129');
  await dialog.getByLabel('Retailer').fill('IKEA');

  // The Buy affordance now shows, carries the price in its label, points at the
  // link, and opens in a new tab.
  await expect(buy).toBeVisible();
  await expect(buy).toHaveText(/Buy · \$129\.00/);
  await expect(buy).toHaveAttribute('href', 'https://example.com/comfy-sofa');
  await expect(buy).toHaveAttribute('target', '_blank');
  await expect(buy).toHaveAttribute('rel', /noopener/);

  // Clearing the link removes the Buy control and the detail fields again —
  // the link is the switch for the whole product.
  await dialog.getByLabel('Product link').fill('');
  await expect(buy).toBeHidden();
  await expect(dialog.getByLabel('Price')).toBeHidden();
});
