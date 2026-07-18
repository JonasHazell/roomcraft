import { test, expect } from '@playwright/test';

/**
 * #270: validation is deferred while a furniture piece is being dragged (to
 * avoid re-running the whole rule catalog per pointer-move frame) and runs once
 * when the gesture ends. The precise "deferred during drag, current on drag-end"
 * behaviour is unit-tested in src/store/useValidationStore.test.ts; this spec is
 * the end-to-end guard that a real drag doesn't error and the validation panel
 * reflects the current design once the drag completes.
 */
test('a furniture drag does not error and validation is current afterwards', async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto('/');
  await page.getByRole('button', { name: /create a room/i }).click();
  await page.getByRole('button', { name: /small room/i }).click();
  await page.getByRole('button', { name: /furnish this room/i }).click();

  // Add a bed — it lands centred and selected, so it can be dragged directly.
  await page.getByRole('button', { name: 'Add furniture' }).click();
  await page.getByRole('button', { name: 'Bed', exact: true }).click();
  await page.getByRole('button', { name: 'OK', exact: true }).click();

  await expect(page.locator('.scene-loading')).toBeHidden({ timeout: 90_000 });
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  if (!box) throw new Error('no canvas box');
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  // Drag across the centred piece with many intermediate moves — the per-frame
  // path that used to re-run validation on every move.
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) {
    await page.mouse.move(cx + i * 4, cy + i * 2);
  }
  await page.mouse.up();

  // No crash / error boundary from the drag.
  expect(errors).toEqual([]);

  // The validation panel reflects the current design: a bed makes the room a
  // bedroom, so the score is an actual number (not the "nothing to score" dash)
  // and the passed/violated summary is shown — i.e. validation ran on the final
  // state, not left stale.
  await page.getByRole('button', { name: /open validation/i }).click();
  const panel = page.getByRole('complementary', { name: 'Validation' });
  await expect(panel).toBeVisible();
  await expect(panel.getByText(/passed ·/)).toBeVisible();
  await expect(panel.getByText(/Interpreted as:/)).toBeVisible();
});
