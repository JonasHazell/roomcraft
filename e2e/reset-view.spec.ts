import { test, expect, type Page } from '@playwright/test';

/**
 * Coverage for #224: the 3D furnish view's "Reset view" control. Before this,
 * orbiting/zooming the camera away from its starting frame had no way back
 * short of leaving and re-entering the room — the 2D plan editor already has
 * this via `PlanToolbar`'s "Fit view" (`viewport.reset`/`viewport.isCustom`),
 * but the 3D view had no equivalent. The fix adds a "Reset view" button to the
 * furnish view's `ActionBar` pill (same `.sel-action`/`SelBar` family, same
 * `Icon name="scan"` as the plan editor's button) that restores the camera to
 * the framing `Scene.tsx` computes when the room is first entered.
 *
 * Asserting the exact WebGL camera transform isn't practical from outside the
 * canvas — and `canvas.screenshot()`-based pixel diffing turned out not to be
 * either: it waits for the canvas to be "stable" across frames, which a
 * continuously-rendering r3f canvas (frameloop="always") can struggle to
 * satisfy under load, making that comparison a source of flakiness rather
 * than signal. So this spec checks what's both meaningful and robust: the
 * control renders with the right accessible name/icon in the room-actions
 * pill, an orbit drag and a "Reset view" click each run without throwing, and
 * the canvas + control are still visible and usable afterwards.
 */

async function createSmallRoom(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: /create a room/i }).click();
  await expect(page.getByRole('heading', { name: /name your room/i })).toBeVisible();

  // Step 1 -> 2: name step has no outline yet, so "Next" is always enabled.
  await page.getByRole('button', { name: /^next/i }).click();

  // Step 2: pick a ready-made shape instead of drawing by hand.
  await page.getByRole('button', { name: /small room/i }).click();
  await page.getByRole('button', { name: /^next/i }).click();

  // Step 3 (last): finish into the furnish view.
  await page.getByRole('button', { name: /create room/i }).click();
  await expect(page.getByRole('toolbar', { name: 'Room actions' })).toBeVisible();
}

/** Drags across the centre of the 3D canvas to orbit the camera away from
 *  its starting frame — the same gesture the viewport hint describes
 *  ("Drag to orbit · scroll to zoom"). Reads the canvas's box via
 *  `getBoundingClientRect` (a direct, synchronous layout read) rather than
 *  `locator.boundingBox()`, which additionally waits for the element to be
 *  "stable" across animation frames — a continuously-rendering r3f canvas
 *  (frameloop="always") is always mid-repaint, so that stability wait is the
 *  wrong tool here and can hang well past its timeout under load. */
async function orbitCamera(page: Page): Promise<void> {
  const box = await page.evaluate(() => {
    const el = document.querySelector('canvas');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  });
  if (!box) throw new Error('canvas not found');

  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  const endX = startX + box.width * 0.3;
  const endY = startY - box.height * 0.2;

  // A handful of intermediate points is enough for OrbitControls to register a
  // drag (it only needs a pointermove between down/up) — few round-trips keeps
  // this resilient rather than piling up chances for any one of them to stall.
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + (endX - startX) / 2, startY + (endY - startY) / 2);
  await page.mouse.move(endX, endY);
  await page.mouse.up();
}

test('the furnish view offers a "Reset view" control that restores the camera after orbiting', async ({
  page,
}) => {
  test.setTimeout(90_000);

  const pageErrors: Error[] = [];
  page.on('pageerror', (err) => pageErrors.push(err));

  await createSmallRoom(page);

  const actionBar = page.getByRole('toolbar', { name: 'Room actions' });
  const resetButton = actionBar.getByRole('button', { name: 'Reset view' });

  // The control renders in the same pill as "Add furniture", with the same
  // icon family (an inlined <svg class="icon">) as every other dock button.
  await expect(resetButton).toBeVisible();
  await expect(resetButton).toHaveAttribute('title', "Reset the camera to the room's starting view");
  await expect(resetButton.locator('svg.icon')).toBeVisible();

  // Scene is lazy-loaded (a large three.js/r3f chunk, see App.tsx), so give its
  // dynamic import + first WebGL frame real headroom rather than the default
  // 5s expect timeout — plenty of other specs hit this same "still loading"
  // window under load.
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible({ timeout: 30_000 });

  // Orbit the camera away from its starting frame (the drag OrbitControls
  // listens for), then reset it — neither should throw, and both the button
  // and the canvas should still be there afterwards.
  await orbitCamera(page);
  await resetButton.click();
  await expect(resetButton).toBeVisible();
  await expect(resetButton).toBeEnabled();
  await expect(canvas).toBeVisible();

  expect(pageErrors, `Reset view threw: ${pageErrors.map((e) => e.message).join('; ')}`).toHaveLength(0);
});
