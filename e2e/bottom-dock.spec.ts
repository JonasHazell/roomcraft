import { test, expect, type Page } from '@playwright/test';

/**
 * Regression coverage for #170: the bottom dock's left `ActionBar` pill used to
 * hold three buttons (Add furniture / Auto / AI), which competed for width with
 * the middle dock slot's contextual pill (SelectionBar/WallBar/FloorBar) on
 * narrow phone viewports — the two pills could visually overlap, and the
 * overlap intercepted taps meant for the other pill. The fix moved Auto-arrange
 * and AI suggestions into the proposal-switcher menu (`ProposalSwitcher.tsx`),
 * leaving `ActionBar` with a single "Add furniture" button so it can no longer
 * grow wide enough to collide with the middle slot. This spec builds a room,
 * selects the floor (so the middle pill renders), and checks the two dock
 * pills' bounding boxes never overlap and that a tap in the left pill's own
 * area still resolves to the left pill — then confirms both relocated actions
 * (AI suggestions, Auto-arrange) are still reachable from the proposal-switcher
 * menu.
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

// The issue's own repro viewport — forced explicitly (on top of the desktop and
// mobile *projects*, see playwright.config.ts) so the overlap geometry is
// checked at the exact narrow width that used to break, in both a mouse-driven
// and a touch-driven browser context.
test.describe('narrow viewport (390x844, the issue repro size)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('the left dock pill and the middle contextual pill never overlap or steal taps', async ({
    page,
  }, testInfo) => {
    // The 3D WebGL scene plus a canvas click can run close to the default 30s
    // budget on an emulated touch browser in a headless/CI-like environment;
    // give this one some headroom rather than risk a flaky timeout.
    test.setTimeout(60_000);
    await createSmallRoom(page);

    // Select something by clicking the centre of the 3D canvas — the default
    // camera looks down over the room, so a centre click hits either the floor
    // or a wall (depending on the room's aspect ratio at this viewport), which
    // surfaces its contextual bar (FloorBar/WallBar — both share the dock-mid
    // slot markup, so either is a valid regression check here).
    const canvas = page.locator('canvas');
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('canvas not found');
    // Slightly below dead-centre: the default orbit camera looks down at the
    // room, so the floor's near edge sits in the lower half of the canvas —
    // dead-centre can land on the far wall or the seam between two walls.
    await canvas.click({ position: { x: canvasBox.width / 2, y: canvasBox.height * 0.65 } });

    const left = page.getByRole('toolbar', { name: 'Room actions' });
    const mid = page.locator('.dock-mid').getByRole('toolbar');
    await expect(left).toBeVisible();
    await expect(mid).toBeVisible();

    const leftBox = await left.boundingBox();
    const midBox = await mid.boundingBox();
    if (!leftBox || !midBox) throw new Error('dock pill not measurable');

    // Log the concrete geometry so a run's console output can be cited directly.
    const midLabel = await mid.getAttribute('aria-label');
    console.log(
      `[${testInfo.project.name}, 390x844] ` +
        `Room actions pill: x ${leftBox.x.toFixed(1)}-${(leftBox.x + leftBox.width).toFixed(1)}, ` +
        `width ${leftBox.width.toFixed(1)}px | ` +
        `${midLabel} pill: x ${midBox.x.toFixed(1)}-${(midBox.x + midBox.width).toFixed(1)}, ` +
        `width ${midBox.width.toFixed(1)}px | gap ${(midBox.x - (leftBox.x + leftBox.width)).toFixed(1)}px`,
    );

    // No horizontal overlap between the two pills.
    expect(leftBox.x + leftBox.width).toBeLessThanOrEqual(midBox.x);

    // The overlap used to also physically steal taps: a click at the left
    // pill's own centre must resolve to an element inside the left dock slot,
    // not the middle one.
    const hit = await page.evaluate(
      ([x, y]) => {
        const el = document.elementFromPoint(x, y);
        if (el?.closest('.dock-left')) return 'left';
        if (el?.closest('.dock-mid')) return 'mid';
        return 'other';
      },
      [leftBox.x + leftBox.width / 2, leftBox.y + leftBox.height / 2] as [number, number],
    );
    expect(hit).toBe('left');
  });

  test('AI suggestions and Auto-arrange are reachable from the proposal-switcher menu', async ({
    page,
  }) => {
    await createSmallRoom(page);

    await page.locator('.proposal-pill').click();
    const menu = page.getByRole('menu', { name: /furnishing proposals/i });
    await expect(menu).toBeVisible();

    // Auto-arrange: clickable, rearranges without throwing, and closes the
    // menu when it settles (see ProposalSwitcher's busy-guard `runAutoArrange`).
    await page.getByRole('button', { name: /auto-arrange/i }).click();
    await expect(menu).toBeHidden();

    // AI suggestions: still one tap away, now via the switcher menu instead of
    // the dock's ActionBar pill.
    await page.locator('.proposal-pill').click();
    await page.getByRole('button', { name: /3 ai suggestions/i }).click();
    await expect(page.getByLabel('AI furnishing')).toBeVisible();
  });
});

test.describe('desktop viewport (1280x800)', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('the dock stays sane on desktop too (no regression)', async ({ page }, testInfo) => {
    await createSmallRoom(page);

    const left = page.getByRole('toolbar', { name: 'Room actions' });
    const right = page.getByRole('toolbar', { name: 'History' });
    await expect(left).toBeVisible();

    const leftBox = await left.boundingBox();
    const rightBox = await right.boundingBox();
    if (!leftBox || !rightBox) throw new Error('dock pill not measurable');

    console.log(
      `[${testInfo.project.name}, 1280x800] ` +
        `Room actions pill: x ${leftBox.x.toFixed(1)}-${(leftBox.x + leftBox.width).toFixed(1)} | ` +
        `History pill: x ${rightBox.x.toFixed(1)}-${(rightBox.x + rightBox.width).toFixed(1)}`,
    );

    // The left pill (now a single button) must stay well clear of the right
    // slot even with nothing selected.
    expect(leftBox.x + leftBox.width).toBeLessThan(rightBox.x);
  });
});
