import { test, expect, type Page, type Locator } from '@playwright/test';

/**
 * #370: a user can select 2+ furniture pieces at once and move/duplicate/delete
 * them as a group, instead of repeating the same action once per piece.
 *
 * Building the group differs by pointer type (see `docs/DESIGN.md` /
 * `docs/MOBILE-FIRST.md`): a fine pointer (desktop) shift/ctrl/cmd-clicks a
 * second piece; a coarse pointer (mobile) has no modifier key, so it taps the
 * selection bar's "Select multiple" toggle first, then taps pieces to add them.
 * `enterAddMode`/`addTap` below pick whichever the current Playwright project
 * actually has, so this spec exercises the real per-device mechanism in both
 * projects rather than faking one on both.
 */

/** Build a small room and land on the 3D furnish view, ready to add pieces. */
async function smallRoom(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /create a room/i }).click();
  await page.getByRole('button', { name: /small room/i }).click();
  await page.getByRole('button', { name: /furnish this room/i }).click();
}

/** Add one furniture piece via the standard pick → place → OK flow. It lands
 *  selected (its "Furniture actions" toolbar visible) once OK is clicked. */
async function addFurniture(page: Page, kind: string) {
  await page.getByRole('button', { name: 'Add furniture' }).click();
  await page.getByRole('button', { name: kind, exact: true }).click();
  await page.getByRole('button', { name: 'OK', exact: true }).click();
}

// The room's centre (where a freshly-placed piece lands, and the camera's orbit
// target) renders around the lower-middle of the canvas, but the exact spot
// shifts with the viewport's aspect ratio — probe a small grid rather than
// hard-code one point (mirrors furniture-click-selection.spec.ts).
const CENTER_CANDIDATES: ReadonlyArray<readonly [number, number]> = [
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
 * Still-clicks candidate points until a "Furniture actions" toolbar appears,
 * returning the canvas-relative point that hit it. Only reliable while a single
 * piece sits in the room (or every other piece has already been moved well clear
 * of these candidates) — see the callers below. A miss is cleared with Escape
 * before the next probe.
 */
async function findSolePieceOnCanvas(
  page: Page,
  canvas: Locator,
  toolbar: Locator,
  box: { width: number; height: number },
  candidates: ReadonlyArray<readonly [number, number]> = CENTER_CANDIDATES,
): Promise<{ x: number; y: number }> {
  let hit: { x: number; y: number } | null = null;
  await expect(async () => {
    for (const [fx, fy] of candidates) {
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
    throw new Error('no candidate point selected the piece');
  }).toPass({ timeout: 60_000 });
  return hit!;
}

/** Drag a selected piece on the canvas from one canvas-relative point to
 *  another, in a few steps so it registers as a drag (not a still click). */
async function dragOnCanvas(
  page: Page,
  box: { x: number; y: number },
  from: { x: number; y: number },
  to: { x: number; y: number },
) {
  const startX = box.x + from.x;
  const startY = box.y + from.y;
  const endX = box.x + to.x;
  const endY = box.y + to.y;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + (endX - startX) * 0.4, startY + (endY - startY) * 0.4, {
    steps: 5,
  });
  await page.mouse.move(endX, endY, { steps: 5 });
  await page.mouse.up();
}

/**
 * Engage whichever "add another piece to the selection" convention this viewport
 * actually offers, returning whether the pointer is coarse. A fine (desktop)
 * pointer has no mode — Shift is held per click instead — so this is a no-op
 * there. A coarse (touch/mobile) pointer has no modifier key, so it flips the
 * selection bar's "Select multiple" toggle once; subsequent plain taps add.
 */
async function enterAddMode(page: Page): Promise<boolean> {
  const coarse = await page.evaluate(() => window.matchMedia('(pointer: coarse)').matches);
  if (coarse) {
    const toggle = page.getByRole('button', { name: 'Select multiple' });
    await expect(toggle).toBeVisible();
    await toggle.click();
    // Wait for multi-select mode to actually engage before tapping the next
    // piece — under parallel test load the store update can lag a beat behind
    // the click, and tapping too early lands as a plain (replacing) select.
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  }
  return coarse;
}

/**
 * One additive tap/click at a canvas point. A single 3D raycast can miss the
 * piece by a pixel under headless WebGL, but the app now treats an additive
 * near-miss as a no-op (it never nukes the in-progress selection), so callers
 * retry this until the group actually forms rather than the first tap having to
 * land dead-on.
 */
async function addTap(
  page: Page,
  canvas: Locator,
  point: { x: number; y: number },
  coarse: boolean,
) {
  if (coarse) {
    await canvas.click({ position: point });
  } else {
    await canvas.click({ position: point, modifiers: ['Shift'] });
  }
}

/** Fold `point`'s piece into the current selection, retrying the additive tap
 *  until the two-piece group toolbar is up — resilient to a raycast near-miss. */
async function addToGroup(
  page: Page,
  canvas: Locator,
  point: { x: number; y: number },
  groupToolbar: Locator,
) {
  const coarse = await enterAddMode(page);
  await expect(async () => {
    await addTap(page, canvas, point, coarse);
    await expect(groupToolbar).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 30_000 });
}

/**
 * Every placed piece's id and floor position (x, z), read straight from the
 * persisted `roomcraft:current` localStorage blob rather than re-locating
 * pieces on screen — the auto-placement algorithm can put freshly-added
 * furniture anywhere in the room (not necessarily stacked at a shared centre
 * point, even though an isometric camera can make two far-apart pieces look
 * screen-adjacent), so this is the only reliable way to confirm a piece
 * actually moved. Mirrors `furnitureCount` in history-bar.spec.ts.
 */
async function furniturePositions(
  page: Page,
): Promise<Record<string, { x: number; z: number }>> {
  return page.evaluate(() => {
    const raw = localStorage.getItem('roomcraft:current');
    if (!raw) return {};
    const out: Record<string, { x: number; z: number }> = {};
    const walk = (v: unknown): void => {
      if (Array.isArray(v)) {
        v.forEach(walk);
        return;
      }
      if (v && typeof v === 'object') {
        const o = v as Record<string, unknown>;
        if (Array.isArray(o.furniture) && Array.isArray(o.proposals)) {
          for (const f of o.furniture as Array<{ id: string; position: { x: number; z: number } }>) {
            out[f.id] = f.position;
          }
          return;
        }
        Object.values(o).forEach(walk);
      }
    };
    walk(JSON.parse(raw));
    return out;
  });
}

test('a multi-selection groups pieces, and Duplicate/Delete act on all of them', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await smallRoom(page);

  const toolbar = page.getByRole('toolbar', { name: 'Furniture actions', exact: true });
  const groupToolbar = page.getByRole('toolbar', { name: /2 selected/ });

  // Place the first piece and pin down its canvas point while it's alone.
  await addFurniture(page, 'Bed');
  await expect(toolbar).toBeVisible();
  await expect(page.locator('.scene-loading')).toBeHidden({ timeout: 90_000 });
  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('canvas not found');
  const bedPoint = await findSolePieceOnCanvas(page, canvas, toolbar, box);

  await page.keyboard.press('Escape');
  await expect(toolbar).toBeHidden();

  // Add a second piece — it lands already selected, alone, exactly like the
  // bed did. Single-selection behaviour (the baseline this issue must not
  // change) still shows the plain, uncounted toolbar and the "More" button.
  await addFurniture(page, 'Chair');
  await expect(toolbar).toBeVisible();
  await expect(page.getByRole('button', { name: 'More settings' })).toBeVisible();

  // Add the bed to the current (chair) selection — a group of two.
  await addToGroup(page, canvas, bedPoint, groupToolbar);
  // Bulk actions replace the single-piece-only controls while a group is active.
  await expect(page.getByRole('button', { name: 'More settings' })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Duplicate' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Delete' })).toBeVisible();

  // Duplicate the group: both pieces get a copy, and the two copies become the
  // new selection — the toolbar keeps showing "2 selected" (not 1), which is
  // exactly what would fail if only one piece had actually been duplicated.
  await page.getByRole('button', { name: 'Duplicate' }).click();
  await expect(groupToolbar).toBeVisible();

  // Delete the group: the whole selection clears.
  await page.getByRole('button', { name: 'Delete' }).click();
  await expect(groupToolbar).toBeHidden();
  await expect(toolbar).toBeHidden();

  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('dragging one piece of a multi-selection moves every selected piece together', async ({
  page,
}) => {
  // Extra headroom over the suite's other specs: this one drives a real drag
  // gesture (several mouse-move frames) on top of the room/piece setup, which
  // can run long under full-suite parallel load.
  test.setTimeout(180_000);
  await smallRoom(page);

  const toolbar = page.getByRole('toolbar', { name: 'Furniture actions', exact: true });
  const groupToolbar = page.getByRole('toolbar', { name: /2 selected/ });

  // Same reliable, no-drag-required layout as the test above: place the bed,
  // pin its point down while it's alone, then add the chair (lands selected,
  // alone) and fold the bed into its selection.
  await addFurniture(page, 'Bed');
  await expect(toolbar).toBeVisible();
  await expect(page.locator('.scene-loading')).toBeHidden({ timeout: 90_000 });
  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('canvas not found');
  const bedPoint = await findSolePieceOnCanvas(page, canvas, toolbar, box);

  await page.keyboard.press('Escape');
  await expect(toolbar).toBeHidden();

  await addFurniture(page, 'Chair');
  await expect(toolbar).toBeVisible();
  // Give the newly-placed piece's pointer handlers a beat to settle — the
  // test above gets this for free from its extra "More settings" assertion.
  await page.waitForTimeout(300);

  await addToGroup(page, canvas, bedPoint, groupToolbar);

  const positionsBefore = await furniturePositions(page);
  const ids = Object.keys(positionsBefore);
  expect(ids).toHaveLength(2);

  // Drag the bed — the piece the pointer actually grabs. The auto-placement
  // algorithm can put the bed and chair anywhere in the room (not necessarily
  // stacked together, even though an isometric camera can make them look
  // screen-adjacent), so a fixed pixel delta can clamp against a wall
  // differently for each once the group-move code applies it to both — the
  // exact landing spot isn't predictable from screen coordinates alone. What
  // must hold regardless is the actual behaviour under test: both pieces'
  // real positions change, not just the one the pointer directly grabbed.
  const bedTarget = { x: bedPoint.x - 100, y: bedPoint.y + 60 };
  await dragOnCanvas(page, box, bedPoint, bedTarget);
  await expect(groupToolbar).toBeVisible(); // the drag preserves the selection
  await expect(page.getByRole('alert')).toHaveCount(0);

  const positionsAfter = await furniturePositions(page);
  for (const id of ids) {
    const before = positionsBefore[id];
    const after = positionsAfter[id];
    expect(after, `piece ${id} missing after the drag`).toBeTruthy();
    const moved = Math.hypot(after.x - before.x, after.z - before.z);
    expect(moved, `piece ${id} should have moved with the group`).toBeGreaterThan(0.05);
  }

  await page.keyboard.press('Escape');
  await expect(groupToolbar).toBeHidden();
});

test('an additive near-miss on empty scenery keeps the selection instead of clearing it', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await smallRoom(page);

  // Matches both the single ("Furniture actions") and multi
  // ("Furniture actions (N selected)") contextual bars.
  const furnitureToolbar = page.getByRole('toolbar', { name: /^Furniture actions/ });
  const singleToolbar = page.getByRole('toolbar', { name: 'Furniture actions', exact: true });

  await addFurniture(page, 'Bed');
  await expect(singleToolbar).toBeVisible();
  await expect(page.locator('.scene-loading')).toBeHidden({ timeout: 90_000 });
  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('canvas not found');
  const bedPoint = await findSolePieceOnCanvas(page, canvas, singleToolbar, box);

  // A point on empty scenery (floor/ground), well clear of the piece.
  const emptyPoint = { x: box.width * 0.5, y: box.height * 0.86 };

  // Sanity check: a *plain* click there really does drop the furniture
  // selection — otherwise the additive assertion below would pass trivially.
  await canvas.click({ position: emptyPoint });
  await expect(furnitureToolbar).toBeHidden();

  // Re-select the bed, then land the exact same click as part of an additive
  // gesture: shift-click on a fine pointer, or a tap while "Select multiple" is
  // engaged on a coarse one. The near-miss must now be a no-op, leaving the
  // piece selected rather than nuking an in-progress multi-selection.
  await page.keyboard.press('Escape');
  await canvas.click({ position: bedPoint });
  await expect(singleToolbar).toBeVisible();

  const coarse = await enterAddMode(page);
  await addTap(page, canvas, emptyPoint, coarse);
  await expect(furnitureToolbar).toBeVisible();

  await expect(page.getByRole('alert')).toHaveCount(0);
});
