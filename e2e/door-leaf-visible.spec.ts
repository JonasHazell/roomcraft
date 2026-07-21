import { test, expect } from '@playwright/test';

/**
 * A placed door used to render as a bare hole in the wall — indistinguishable
 * from an unfinished opening — while a window at the same spot got a tinted
 * glass pane. A `DoorLeaf` now fills the opening the same way `WindowPane`
 * does (#355). Runs in both `desktop` and `mobile`.
 *
 * #384: adding a door then a window to the same wall used to always place
 * both at the same fixed offset regardless of what was already there, so
 * they overlapped (or, for two windows, landed as an exact duplicate). A
 * fresh opening now nudges clear of any sibling already on the wall.
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

  // A freshly-added opening auto-expands its own From-start/Width fields
  // (collapsing any previously-expanded one), so read each one right after
  // adding it.
  await page.getByRole('button', { name: /add door/i }).click();
  await expect(page.locator('.opening-summary')).toHaveCount(1);
  const doorOffset = Number(await page.getByLabel('From start').inputValue());
  const doorWidth = Number(await page.getByLabel('Width').inputValue());

  await page.getByRole('button', { name: /add window/i }).click();
  await expect(page.locator('.opening-summary')).toHaveCount(2);
  const windowOffset = Number(await page.getByLabel('From start').inputValue());
  const windowWidth = Number(await page.getByLabel('Width').inputValue());

  // #384: the door and window must not overlap along the wall — the door's
  // fixed default span is 50-140cm and the window's is 80-200cm, a 60cm
  // overlap before the fix. Sort by offset and check the first span ends at
  // or before the second begins.
  const [first, second] = [
    { offset: doorOffset, width: doorWidth },
    { offset: windowOffset, width: windowWidth },
  ].sort((a, b) => a.offset - b.offset);
  expect(first.offset + first.width).toBeLessThanOrEqual(second.offset);

  // Enter the 3D furnish view — the geometry (and the new DoorLeaf/WindowPane
  // meshes) is only built there.
  await page.getByRole('button', { name: /furnish this room/i }).click();
  await expect(page.getByRole('button', { name: 'Add furniture' })).toBeVisible();
  await page.waitForTimeout(500); // let the scene mount and render a frame

  expect(errors, `unexpected console/page errors: ${errors.join('\n')}`).toEqual([]);
});
