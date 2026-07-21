import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * #351: a user can attach a real, purchasable product link (and optional
 * price/retailer) to a piece they've placed, and see a "Buy" affordance for
 * it — the first step toward the furniture-catalogue revenue model (see
 * docs/VISION.md#how-it-makes-money). See `FurnitureFields.tsx`'s
 * `ProductLinkFields` (the "Product link" field group) and
 * `FurnitureDialog.tsx`'s footer "Buy" button, which opens the link in a new
 * tab once one is set.
 *
 * Runs in both the `desktop` and `mobile` projects (see playwright.config.ts).
 */

const MEDIA_DIR = join(process.cwd(), 'pr-media-out');

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('setting a product link surfaces a "Buy" button; a piece with none shows neither', async ({
  page,
}, testInfo) => {
  // The flow mounts the 3D scene and opens the furniture dialog on top of it —
  // WebGL under mobile Chrome emulation is slower, so give it headroom (same
  // budget as furniture-appearance-grouped.spec.ts's equivalent flow).
  test.setTimeout(60_000);

  // Build a room from a template — fast, no manual wall-drawing needed.
  await page.getByRole('button', { name: /create a room/i }).click();
  await page.getByRole('button', { name: /^bedroom/i }).click();
  await page.getByRole('button', { name: /furnish this room/i }).click();

  // A single-part piece keeps this spec focused on the product-link controls
  // rather than the per-part appearance grouping (covered elsewhere).
  await page.getByRole('button', { name: 'Add furniture' }).click();
  await page.getByRole('button', { name: 'Chair', exact: true }).click();

  const dialog = page.getByRole('dialog', { name: 'Furniture settings' });
  await expect(dialog).toBeVisible();

  // A fresh piece has no product link: the Link field is blank, the
  // price/retailer subfields aren't shown yet (nothing to attach them to),
  // and there is no stray "Buy" affordance in the footer.
  await expect(dialog.getByLabel('Link')).toHaveValue('');
  await expect(dialog.getByLabel('Price')).toHaveCount(0);
  await expect(dialog.getByLabel('Retailer')).toHaveCount(0);
  await expect(dialog.getByRole('link', { name: /buy/i })).toHaveCount(0);

  // Attach a product link with a price and retailer.
  await dialog.getByLabel('Link').fill('https://example.com/oak-chair');
  await dialog.getByLabel('Price').fill('129.99');
  await dialog.getByLabel('Retailer').fill('Example Furniture Co');

  // The "Buy" button appears next to "Save to library", pointing at the
  // entered link, opening in a new tab.
  const buy = dialog.getByRole('link', { name: /buy/i });
  await expect(buy).toBeVisible();
  await expect(buy).toHaveAttribute('href', 'https://example.com/oak-chair');
  await expect(buy).toHaveAttribute('target', '_blank');
  await expect(buy).toHaveAttribute('rel', /noopener/);

  mkdirSync(MEDIA_DIR, { recursive: true });
  await page.screenshot({ path: join(MEDIA_DIR, `product-link-buy-${testInfo.project.name}.png`) });

  // Clearing the link removes both the subfields and the "Buy" button again —
  // it isn't a one-way affordance once shown.
  await dialog.getByLabel('Link').fill('');
  await expect(dialog.getByLabel('Price')).toHaveCount(0);
  await expect(dialog.getByLabel('Retailer')).toHaveCount(0);
  await expect(dialog.getByRole('link', { name: /buy/i })).toHaveCount(0);
});
