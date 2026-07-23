import { test, expect } from '@playwright/test';

/**
 * An exterior wall standing between the camera and the room fades to a faint
 * glass plane so the space stays legible. A door mounted on that wall now fades
 * in lock-step with it — otherwise the door panel floats opaque in mid-air in
 * front of a see-through wall. This drives the real 3D flow and orbits the
 * camera so the door's wall crosses in and out of the faded state, exercising
 * the fade loop's door branch toward both targets. Runs in `desktop` and
 * `mobile`.
 */

test('a door on an exterior wall renders through a camera orbit without errors', async ({
  page,
}) => {
  // Building the room, entering the 3D view, and orbiting the WebGL scene is
  // heavy — comfortably under the default 30s on desktop, but the emulated
  // mobile viewport renders ~2× slower here, so give it real headroom.
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto('/');
  await page.getByRole('button', { name: /create a room/i }).click();
  await page.getByRole('button', { name: /^bedroom/i }).click();

  // Put a door on a perimeter (exterior) wall — the only walls that fade.
  const wallHit = page.locator('.wall-hit').first();
  const wallBox = await wallHit.boundingBox();
  await page.mouse.click(wallBox!.x + wallBox!.width / 2, wallBox!.y + wallBox!.height / 2);
  await page.getByRole('button', { name: /add door/i }).click();
  await expect(page.locator('.opening-summary')).toHaveCount(1);

  // Enter the 3D furnish view where the wall/door meshes are built and the fade
  // loop runs each frame.
  await page.getByRole('button', { name: /furnish this room/i }).click();
  await expect(page.getByRole('button', { name: 'Add furniture' })).toBeVisible();

  const canvas = page.locator('canvas').first();
  const box = await canvas.boundingBox();
  const cx = box!.x + box!.width / 2;
  const cy = box!.y + box!.height / 2;
  // Stay within the canvas on the narrow mobile viewport.
  const reach = Math.min(box!.width, box!.height) / 3;

  // Orbit the camera so the door's wall faces the camera (faded) and then
  // rotates away (opaque), driving the door opacity across its range.
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + reach, cy, { steps: 6 });
  await page.waitForTimeout(150);
  await page.mouse.move(cx - reach, cy, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(400); // let the cross-fade settle

  expect(errors, `unexpected console/page errors: ${errors.join('\n')}`).toEqual([]);
});
