import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

/**
 * Regression coverage for #249: on a mobile viewport, opening the wall-detail
 * sheet (selecting a wall, then adding doors/windows) feeds its measured height
 * to the plan editor's auto-fit as a `bottom` inset. The fit used to subtract it
 * with no lower bound, so a tall sheet (`min(48vh, 460px)` + ~82px dock offset)
 * reserved most of a phone's canvas and shrank the room into an un-tappable
 * sliver — a tap on a wall would miss and deselect instead of selecting.
 *
 * The fix floors the auto-fit's available height at
 * `MIN_FIT_HEIGHT_FRACTION` (0.4) of the canvas height — see
 * `src/components/plan/useViewport.ts` (`availableFitHeight` / `fitViewBox`). The
 * drawing therefore always gets at least 40% of the canvas to fit into, no matter
 * how tall the sheet grows.
 *
 * This spec drives the real wizard on a phone-sized viewport, grows the sheet to
 * its cap, and asserts the drawing's ACTUAL on-screen size stays at (or above) the
 * 40% floor and that a wall is still tappable/selectable underneath the open
 * sheet. Forcing the viewport (on top of the desktop + mobile projects) pins the
 * fit geometry to the exact narrow size the issue named, in both browser contexts.
 */

const MEDIA_DIR = '.github/pr-media/agent/issue-249-cap-canvas-shrink';

// The auto-fit floor and the plan editor's per-side padding, mirrored from source
// so the expected on-screen size is computed from the same constants the app uses.
const MIN_FIT_HEIGHT_FRACTION = 0.4;
const PLAN_PAD_M = 2; // PlanEditor pads the walls bounds by 2 m on every side.
const ROOM_M = 3; // The "Small room" template is 3 m x 3 m.
const CONTENT_M = ROOM_M + 2 * PLAN_PAD_M; // 7 m of world height the fit must show.

/** Build a "Small room" and advance to the wizard's openings step, where a wall
 *  can be selected to open the full doors/windows sheet. */
async function reachOpeningsStep(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: /create a room/i }).click();
  await page.getByRole('button', { name: /^next/i }).click();
  await page.getByRole('button', { name: /small room/i }).click();
  await page.getByRole('button', { name: /^next/i }).click();
  await expect(page.locator('.plan-hint-pill')).toContainText(/ceiling height/i);
}

/** Screen-space centre of the top-most exterior wall's hit target. */
async function topWallCentre(page: Page): Promise<{ x: number; y: number }> {
  const boxes = await page.locator('.plan-wall.exterior .wall-hit').evaluateAll((els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }),
  );
  if (boxes.length === 0) throw new Error('no exterior wall hit targets found');
  return boxes.reduce((top, b) => (b.y < top.y ? b : top));
}

test.describe('mobile plan editor (393x851, the #249 repro size)', () => {
  test.use({ viewport: { width: 393, height: 851 } });

  test('the wall-detail sheet cannot shrink the canvas below the fit floor', async ({
    page,
  }, testInfo) => {
    await reachOpeningsStep(page);

    const svg = page.locator('.plan-editor > svg');
    const svgBox = await svg.boundingBox();
    if (!svgBox) throw new Error('plan canvas not measurable');

    // Select the top wall to open the sheet, then grow it with several openings
    // so it reaches its `min(48vh, 460px)` cap — the worst case for #249.
    const before = await topWallCentre(page);
    await page.mouse.click(before.x, before.y);
    const sheet = page.locator('.plan-wall-panel');
    await expect(sheet).toBeVisible();

    for (let i = 0; i < 8; i++) {
      await page.getByRole('button', { name: /add door/i }).click();
    }

    // Confirm the sheet really is near its height cap (~48vh), so the floor is the
    // constraint actually holding the drawing up — not a half-open sheet.
    const sheetBox = await sheet.boundingBox();
    if (!sheetBox) throw new Error('wall sheet not measurable');
    expect(sheetBox.height).toBeGreaterThan(0.4 * svgBox.height);

    // Measure the room's real on-screen size. The walls group's bounding box spans
    // the 3 m room; with the vertical axis binding on a portrait phone, its size is
    // ROOM_M * scale, and the floor guarantees scale >= 0.4 * canvasH / CONTENT_M.
    const wallsBox = await page.locator('.plan-walls').boundingBox();
    if (!wallsBox) throw new Error('walls group not measurable');
    const floorScalePxPerM = (MIN_FIT_HEIGHT_FRACTION * svgBox.height) / CONTENT_M;
    const minRoomPx = ROOM_M * floorScalePxPerM;

    console.log(
      `[${testInfo.project.name}] canvas h=${svgBox.height.toFixed(1)} sheet h=${sheetBox.height.toFixed(1)} ` +
        `walls box=${wallsBox.width.toFixed(1)}x${wallsBox.height.toFixed(1)} floor min=${minRoomPx.toFixed(1)}px`,
    );

    // The drawing must be at least the floor size (small tolerance for wall
    // thickness / sub-pixel rounding). Pre-fix, an un-floored fit gave ~127px here
    // (vs the floored ~146px) and this assertion fails.
    expect(wallsBox.height).toBeGreaterThanOrEqual(0.95 * minRoomPx);
    expect(wallsBox.width).toBeGreaterThanOrEqual(0.95 * minRoomPx);

    // The floor deliberately lets the room's lower edge tuck a little behind the
    // sheet (the user can pan) — but its top wall must stay clear of the sheet so
    // it can be tapped. Pre-fit into a sliver, the whole (tiny) room floated high
    // in a thin band; the point of the floor is that the walls are big enough to
    // hit, and the top wall sits above the sheet.
    const after = await topWallCentre(page);
    expect(after.y).toBeLessThan(sheetBox.y);

    // A wall tap still selects (does not miss and deselect): tap the top wall's
    // centre and the sheet must remain, showing the selection held.
    await page.mouse.click(after.x, after.y);
    await expect(sheet).toBeVisible();

    mkdirSync(MEDIA_DIR, { recursive: true });
    await page.screenshot({ path: `${MEDIA_DIR}/${testInfo.project.name}-393-wall-sheet-open.png` });
  });
});

// The fix is mobile-specific, but capture the same flow at a desktop width too so
// the media set shows the clamp stays inert there (the sheet is a small share of a
// tall, wide canvas, so the floor never engages and the fit is unchanged).
test.describe('desktop plan editor (1440x900, clamp inert)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('the wall sheet opens without disturbing the desktop fit', async ({ page }, testInfo) => {
    await reachOpeningsStep(page);
    const before = await topWallCentre(page);
    await page.mouse.click(before.x, before.y);
    const sheet = page.locator('.plan-wall-panel');
    await expect(sheet).toBeVisible();
    for (let i = 0; i < 4; i++) {
      await page.getByRole('button', { name: /add door/i }).click();
    }
    const wallsBox = await page.locator('.plan-walls').boundingBox();
    if (!wallsBox) throw new Error('walls group not measurable');
    // The room stays a healthy size on desktop (the floor is inert here).
    expect(wallsBox.height).toBeGreaterThan(120);

    mkdirSync(MEDIA_DIR, { recursive: true });
    await page.screenshot({ path: `${MEDIA_DIR}/${testInfo.project.name}-1440-wall-sheet-open.png` });
  });
});
