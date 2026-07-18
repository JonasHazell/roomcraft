import { test, expect } from '@playwright/test';

/**
 * A placed door used to render as a bare hole in the wall — indistinguishable
 * from an unfinished opening — while a window at the same spot got a tinted
 * glass pane. A `DoorLeaf` now fills the opening the same way `WindowPane`
 * does (#355). Runs in both `desktop` and `mobile`.
 */

test('a door and a window on the same wall both render without errors in 3D', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto('/');
  await page.getByRole('button', { name: /create a room/i }).click();
  await page.getByRole('button', { name: /^bedroom/i }).click();

  // Select the front wall, add a door and a window to it.
  const wallHit = page.locator('.wall-hit').first();
  const wallBox = await wallHit.boundingBox();
  await page.mouse.click(wallBox!.x + wallBox!.width / 2, wallBox!.y + wallBox!.height / 2);
  await page.getByRole('button', { name: /add door/i }).click();
  await page.getByRole('button', { name: /add window/i }).click();
  await expect(page.locator('.opening-summary')).toHaveCount(2);

  // Enter the 3D furnish view — the geometry (and the new DoorLeaf/WindowPane
  // meshes) is only built there.
  await page.getByRole('button', { name: /furnish this room/i }).click();
  await expect(page.getByRole('button', { name: 'Add furniture' })).toBeVisible();
  await page.waitForTimeout(500); // let the scene mount and render a frame

  expect(errors, `unexpected console/page errors: ${errors.join('\n')}`).toEqual([]);
});
