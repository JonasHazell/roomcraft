import { test, expect } from '@playwright/test';

/**
 * #294: the 2D plan editor's draggable wall band and corner handles should show
 * the grab cursor (like the proposal switcher's reorder grip), not a plain
 * `pointer` that reads as merely "clickable". Cursors are a mouse-only
 * affordance, but the resolved CSS is the same in both projects, so this
 * assertion runs in desktop and mobile alike.
 */
test('wall and corner drag handles use the grab cursor', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: /create a room/i }).click();
  await page.getByLabel(/room name/i).fill('Cursor Test');
  await page.getByRole('button', { name: /small room/i }).click();

  // The corner handle already used `grab`; the wall band used `pointer` and now
  // uses `grab` too, since the whole band is draggable (moveWall).
  const corners = page.locator('.plan-corners .corner-hit');
  await expect(corners.first()).toBeAttached();
  await expect(corners.first()).toHaveCSS('cursor', 'grab');

  const walls = page.locator('.plan-wall .wall-hit');
  await expect(walls.first()).toBeAttached();
  await expect(walls.first()).toHaveCSS('cursor', 'grab');
});
