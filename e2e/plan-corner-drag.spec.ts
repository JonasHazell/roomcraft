import { test, expect } from '@playwright/test';

/**
 * Regression coverage for #196: dragging a room corner in the 2D plan editor
 * used to move the wall far more than the pointer actually travelled. The
 * root cause was that the canvas's auto-fit viewBox tracks the live wall
 * geometry, and a corner drag changes that geometry on every pointermove —
 * so the view rescaled mid-drag, and each subsequent pointer position (read
 * through the freshly-rescaled screen→world matrix) resolved to a larger
 * world delta than before, compounding into ~5x amplification over a single
 * drag. The fix freezes the auto-fit to the geometry as it was when the drag
 * started, so the screen→world scale stays constant for the whole gesture.
 *
 * This test drives a real pointer drag on a corner handle and checks that the
 * resulting world-space movement matches the on-screen pixel delta at the
 * room's actual screen-to-world scale — not several times larger.
 */

test('dragging a room corner moves it in step with the pointer, not amplified', async ({
  page,
}) => {
  await page.goto('/');

  // Create a room and pick the 3x3 m "Small room" template — the same
  // starting point used to verify #196 live.
  await page.getByRole('button', { name: /create a room/i }).click();
  await page.getByLabel(/room name/i).fill('Corner Drag Test');
  await page.getByRole('button', { name: /^next/i }).click();
  await page.getByRole('button', { name: /small room/i }).click();

  const corners = page.locator('.plan-corner .corner-hit');
  await expect(corners).toHaveCount(4);

  // Read every corner's world position (cx/cy, meters) and on-screen center,
  // so we know both the actual rendered px/m scale and which handle to drag.
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

  // The two "top" corners (smallest world z) give the actual rendered scale —
  // this is the same measurement the issue's own evidence used (167.1px for a
  // 3 m room at a 390x844 viewport).
  const minZ = Math.min(...before.map((c) => c.worldZ));
  const top = before.filter((c) => Math.abs(c.worldZ - minZ) < 0.01).sort((a, b) => a.worldX - b.worldX);
  expect(top).toHaveLength(2);
  const [topLeft, topRight] = top;
  const screenPxApart = Math.hypot(topRight.screenX - topLeft.screenX, topRight.screenY - topLeft.screenY);
  const worldMApart = topRight.worldX - topLeft.worldX; // 3 m for the small template
  const scaleMPerPx = worldMApart / screenPxApart;

  const dragIndex = before.indexOf(topLeft);
  const target = corners.nth(dragIndex);

  // Drag the top-left corner by a known, modest screen-pixel delta, with
  // enough intermediate steps to reproduce the real multi-pointermove drag
  // that triggered the runaway feedback loop pre-fix.
  const dx = 50;
  const dy = 50;
  await page.mouse.move(topLeft.screenX, topLeft.screenY);
  await page.mouse.down();
  const steps = 20;
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
  const expectedDelta = dx * scaleMPerPx; // ~0.9 m at the 390-wide viewport

  // The drag must track the pointer 1:1 (within one 10 cm snap step) — not
  // land several times further out, as it did before the fix (observed
  // ~1.9-4.4 m instead of ~0.9 m for the same pointer movement).
  expect(Math.abs(actualDeltaX - expectedDelta)).toBeLessThan(0.15);
  expect(Math.abs(actualDeltaZ - expectedDelta)).toBeLessThan(0.15);
  expect(actualDeltaX).toBeLessThan(expectedDelta * 2);
  expect(actualDeltaZ).toBeLessThan(expectedDelta * 2);
});
