import { test, expect } from '@playwright/test';

/**
 * #288: the furniture rotation handle's grab radius now widens on coarse
 * (touch) pointers (0.34 vs 0.22, mirroring PlanCorners). The exact radius is
 * unit-tested in src/lib/rotateHandle.test.ts; this spec is a render-regression
 * guard — the added useMediaQuery(COARSE_POINTER) branch must not break
 * selecting a piece and showing its (rotation-handle-bearing) 3D selection in
 * either viewport, including the coarse-pointer mobile project.
 */
test('a selected piece still renders its 3D selection in both viewports', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/');

  await page.getByRole('button', { name: /create a room/i }).click();
  await page.getByRole('button', { name: /small room/i }).click();
  await page.getByRole('button', { name: /furnish this room/i }).click();

  // Add a bed; the pick→place flow lands on its editing surface with the piece
  // selected (so the rotation handle is rendered in the 3D scene).
  await page.getByRole('button', { name: 'Add furniture' }).click();
  await page.getByRole('button', { name: 'Bed', exact: true }).click();
  await page.getByRole('button', { name: 'OK', exact: true }).click();

  // The selected piece's action toolbar is visible and the 3D canvas rendered —
  // no crash from the coarse-pointer branch, in desktop or mobile.
  await expect(page.getByRole('toolbar', { name: 'Furniture actions' })).toBeVisible();
  await expect(page.locator('canvas')).toBeVisible();
});
