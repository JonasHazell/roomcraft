import { test, expect } from '@playwright/test';

/**
 * Resizing or rotating a furniture piece must respect the same wall/obstacle
 * collision guarantee as dragging it (see `updateFurniture` in
 * `src/store/slices/furnitureSlice.ts`, which reuses `furnitureFits` /
 * `slideFurniture` from `src/lib/collision.ts` the same way `moveFurniture`
 * does). This drives the real resize (the "Add furniture" dialog's Width/Depth
 * fields) and rotate (the `R` shortcut) flows end to end and checks the app
 * keeps working — no crash, no error boundary — instead of silently leaving an
 * overlapping piece behind. The exact corrected position is covered by the
 * `furnitureSlice.test.ts` unit tests; this spec is the UI-reachability check.
 */

test('resizing and rotating furniture stays inside the app without crashing', async ({ page }) => {
  test.setTimeout(60000);
  const pageErrors: string[] = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));

  await page.goto('/');

  // Build a room from the "Living room" template (4 × 5 m) — quicker and more
  // robust than drawing an outline by hand, and gives every test run the same
  // starting geometry.
  await page.getByRole('button', { name: /create a room/i }).click();
  await page.getByLabel(/room name/i).fill('Collision test room');
  await page.getByRole('button', { name: /living room/i }).click();
  await page.getByRole('button', { name: /furnish this room/i }).click();

  // Add a chair and open its edit form straight away (the "pick → place → tweak"
  // flow described in FurnitureDialog).
  await page.getByRole('button', { name: /add furniture/i }).click();
  await page.getByRole('button', { name: 'Chair', exact: true }).click();

  const width = page.getByLabel('Width');
  const depth = page.getByLabel('Depth');
  await expect(width).toBeVisible();

  // Grow the chair well past the room's 4 × 5 m footprint — with the old
  // `clampFurniture`-only behaviour this would commit stuck through a wall.
  await width.fill('350');
  await depth.fill('180');
  await expect(width).toHaveValue('350');
  await expect(depth).toHaveValue('180');

  await page.getByRole('button', { name: 'OK', exact: true }).click();

  // The dialog closes back onto the selection bar for the piece — collision
  // correction ran without throwing, so the app is still usable.
  await expect(page.getByRole('button', { name: 'Duplicate' })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);

  // Rotate it — the R shortcut goes through the same `updateFurniture` path.
  await page.keyboard.press('r');
  await page.keyboard.press('r');
  await expect(page.getByRole('button', { name: 'Duplicate' })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);

  expect(pageErrors).toEqual([]);
});
