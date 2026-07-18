import { test, expect } from '@playwright/test';

/**
 * Regression coverage for #362: dragging a room corner while the wall detail
 * panel is open distorted the room by several times the actual pointer
 * movement. Root cause — `panelInset` (the space `useViewport` reserves for
 * the panel) wasn't frozen the same way the wall geometry already was
 * (#196): starting a corner drag deselects the wall, unmounting the panel and
 * dropping `panelInset` to 0 mid-gesture while the frozen geometry stayed
 * fixed, so the fit height (and the pixel↔world scale) jumped partway
 * through the drag. The fix freezes the inset alongside the geometry.
 *
 * Same shape as `plan-corner-drag.spec.ts`, but with the panel open first.
 */

test('dragging a corner with the wall panel open moves it in step with the pointer', async ({
  page,
}) => {
  await page.goto('/');

  await page.getByRole('button', { name: /create a room/i }).click();
  await page.getByLabel(/room name/i).fill('Corner Drag Panel Test');
  await page.getByRole('button', { name: /small room/i }).click();

  // Select a wall and add a door so its detail panel opens and stays open.
  // The hit line is invisible (stroke transparent), so click its bbox centre.
  const wallHit = page.locator('.wall-hit').first();
  const wallBox = await wallHit.boundingBox();
  await page.mouse.click(wallBox!.x + wallBox!.width / 2, wallBox!.y + wallBox!.height / 2);
  await page.getByRole('button', { name: /add door/i }).click();
  await expect(page.locator('.plan-wall-panel')).toBeVisible();

  const corners = page.locator('.plan-corner .corner-hit');
  await expect(corners).toHaveCount(4);

  const before = await corners.evaluateAll((els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      return {
        worldX: parseFloat(el.getAttribute('cx')!),
        worldZ: parseFloat(el.getAttribute('cy')!),
        screenX: r.left + r.width / 2,
        screenY: r.top + r.height / 2,
      };
    }),
  );

  const minZ = Math.min(...before.map((c) => c.worldZ));
  const top = before.filter((c) => Math.abs(c.worldZ - minZ) < 0.01).sort((a, b) => a.worldX - b.worldX);
  expect(top).toHaveLength(2);
  const [topLeft, topRight] = top;
  const screenPxApart = Math.hypot(topRight.screenX - topLeft.screenX, topRight.screenY - topLeft.screenY);
  const worldMApart = topRight.worldX - topLeft.worldX; // 3 m for the small template
  const scaleMPerPx = worldMApart / screenPxApart;

  const dragIndex = before.indexOf(topLeft);
  const target = corners.nth(dragIndex);

  // A small, deliberately modest drag — the issue's own repro used ~30px.
  const dx = 30;
  const dy = 30;
  await page.mouse.move(topLeft.screenX, topLeft.screenY);
  await page.mouse.down();
  const steps = 12;
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(topLeft.screenX + (dx * i) / steps, topLeft.screenY + (dy * i) / steps);
  }
  await page.mouse.up();

  const afterWorld = await target.evaluate((el) => ({
    x: parseFloat(el.getAttribute('cx')!),
    z: parseFloat(el.getAttribute('cy')!),
  }));

  const actualDeltaX = afterWorld.x - topLeft.worldX;
  const actualDeltaZ = afterWorld.z - topLeft.worldZ;
  const expectedDelta = dx * scaleMPerPx;

  // Must track the pointer 1:1 (within one 10cm snap step), not land several
  // times further out (observed 1.1-2.9 m instead of ~0.6 m pre-fix).
  expect(Math.abs(actualDeltaX - expectedDelta)).toBeLessThan(0.15);
  expect(Math.abs(actualDeltaZ - expectedDelta)).toBeLessThan(0.15);
  expect(actualDeltaX).toBeLessThan(expectedDelta * 2);
  expect(actualDeltaZ).toBeLessThan(expectedDelta * 2);
});
