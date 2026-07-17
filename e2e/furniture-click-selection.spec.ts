import { test, expect, type Page, type Locator } from '@playwright/test';

/**
 * Furniture must be selected by a *click*, the same way walls and floors are
 * (see the `e.delta > 3` still-click guard in `Walls.tsx` / `Floor.tsx`), not by
 * the mere press of the pointer.
 *
 * Before this fix `FurnitureMesh`'s `onPointerDown` selected the piece the
 * instant the button went down, so a camera orbit/pan that happened to start on
 * a piece immediately selected it — unlike walls and floors, which only select
 * on a genuine still click. This drives the real 3D view in both the desktop and
 * mobile projects and checks:
 *   1. a still click on the piece selects it (its "Furniture actions" toolbar
 *      appears), and
 *   2. a drag that starts on the piece (a camera-orbit gesture) does NOT select
 *      it — the toolbar stays hidden.
 */

/** Build a small room and drop a bed at its centre via the standard flow. */
async function smallRoomWithCentredBed(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /create a room/i }).click();
  await expect(page.getByRole('heading', { name: /name your room/i })).toBeVisible();
  await page.getByRole('button', { name: /^next/i }).click();
  await page.getByRole('button', { name: /small room/i }).click();
  await expect(page.getByRole('button', { name: /^next/i })).toBeEnabled();
  await page.getByRole('button', { name: /^next/i }).click();
  await page.getByRole('button', { name: /create room/i }).click();

  await page.getByRole('button', { name: 'Add furniture' }).click();
  await page.getByRole('button', { name: 'Bed', exact: true }).click();
  await page.getByRole('button', { name: 'OK', exact: true }).click();
}

// The bed sits at the room centre (the camera's orbit target), so it renders
// around the lower-middle of the canvas — but the exact spot shifts with the
// viewport's aspect ratio, so probe a small grid rather than hard-code one point.
const BED_CANDIDATES: ReadonlyArray<readonly [number, number]> = [
  [0.5, 0.55],
  [0.54, 0.58],
  [0.5, 0.6],
  [0.46, 0.56],
  [0.58, 0.6],
  [0.5, 0.5],
  [0.54, 0.52],
  [0.5, 0.64],
  [0.6, 0.62],
  [0.44, 0.58],
];

/**
 * Still-clicks candidate points until the piece's "Furniture actions" toolbar
 * appears, returning the canvas-relative point that hit it. A click that lands
 * on the floor/wall instead is cleared with Escape before the next probe. The
 * whole sweep is retried so a first pass before the WebGL scene is pickable
 * doesn't fail the test.
 */
async function clickToSelectBed(
  page: Page,
  canvas: Locator,
  toolbar: Locator,
  box: { width: number; height: number },
): Promise<{ x: number; y: number }> {
  let hit: { x: number; y: number } | null = null;
  await expect(async () => {
    for (const [fx, fy] of BED_CANDIDATES) {
      const pos = { x: box.width * fx, y: box.height * fy };
      await canvas.click({ position: pos });
      try {
        await expect(toolbar).toBeVisible({ timeout: 1200 });
        hit = pos;
        return;
      } catch {
        await page.keyboard.press('Escape');
        await expect(toolbar).toBeHidden({ timeout: 1200 }).catch(() => {});
      }
    }
    throw new Error('no candidate point selected the bed');
  }).toPass({ timeout: 60_000 });
  return hit!;
}

test('a piece is selected by a click, but a camera drag over it is not', async ({ page }) => {
  // The full flow mounts the 3D scene (lazy-loaded, plus a WebGL warm-up) and
  // clicks into it; on an emulated touch browser under load this runs well past
  // the default 30s budget.
  test.setTimeout(120_000);

  await smallRoomWithCentredBed(page);

  // Placing a piece lands on its editing toolbar — deselect so we start clean.
  const toolbar = page.getByRole('toolbar', { name: 'Furniture actions' });
  await expect(toolbar).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(toolbar).toBeHidden();

  // Wait for the 3D canvas to actually paint before picking against it.
  await expect(page.locator('.scene-loading')).toBeHidden({ timeout: 90_000 });
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  if (!box) throw new Error('canvas not found');

  // 1. A still click on the piece selects it — just like walls and floors. This
  //    also pins down exactly where the bed sits on this viewport's canvas.
  const bedPoint = await clickToSelectBed(page, canvas, toolbar, box);

  // Deselect and prove a drag starting on the very same spot does NOT select.
  await page.keyboard.press('Escape');
  await expect(toolbar).toBeHidden();

  // 2. Drag across the piece as if orbiting the camera: press on it, move the
  //    pointer well past the still-click threshold, release. This must NOT
  //    select it — before the fix the press alone (onPointerDown) selected it.
  const startX = box.x + bedPoint.x;
  const startY = box.y + bedPoint.y;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 60, startY + 40, { steps: 8 });
  await page.mouse.move(startX + 130, startY + 90, { steps: 8 });
  await page.mouse.up();

  await expect(toolbar).toBeHidden();
});
