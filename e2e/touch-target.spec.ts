import { test, expect, type Page } from '@playwright/test';

/**
 * Regression coverage for issue #197: the bottom dock's pill actions
 * (`.sel-action`, used by ActionBar/SelectionBar/WallBar/FloorBar/HistoryBar,
 * see src/components/panel/SelBar.tsx) must keep a >=44px hit area on coarse
 * (touch) pointers, per docs/DESIGN.md and docs/MOBILE-FIRST.md. A later,
 * unconditional `.sel-action { min-height: 38px; }` rule in src/index.css used
 * to win the cascade over the earlier `@media (pointer: coarse)` 44px rule on
 * every viewport (both selectors are one class, so source order decided) —
 * this spec measures the real computed style, not just the visuals, so that
 * regression can't silently slip back in.
 *
 * A fresh browser context has empty localStorage, so we seed a minimal, already
 * -drawn room directly (schema v5, see src/lib/persistence.ts) rather than
 * driving the New room flow's freehand wall-drawing canvas — this
 * lands straight on a room card in the lobby that opens directly into the
 * furnish view, where ActionBar (left pill) and HistoryBar (right pill) render
 * unconditionally, without needing to select any furniture/wall/floor.
 */

const project = {
  schemaVersion: 5,
  name: 'My rooms',
  updatedAt: new Date().toISOString(),
  rooms: [
    {
      id: 'room-1',
      name: 'Touch Target Room',
      updatedAt: new Date().toISOString(),
      room: { height: 2.5 },
      floorColor: '#c9a878',
      wallColor: '#efe8da',
      floorMaterial: 'matte',
      wallMaterial: 'matte',
      walls: [
        { id: 'w1', kind: 'exterior', a: { x: -2, z: -2.5 }, b: { x: 2, z: -2.5 } },
        { id: 'w2', kind: 'exterior', a: { x: 2, z: -2.5 }, b: { x: 2, z: 2.5 } },
        { id: 'w3', kind: 'exterior', a: { x: 2, z: 2.5 }, b: { x: -2, z: 2.5 } },
        { id: 'w4', kind: 'exterior', a: { x: -2, z: 2.5 }, b: { x: -2, z: -2.5 } },
      ],
      openings: [],
      furniture: [],
      proposals: [
        {
          id: 'p1',
          name: 'Proposal 1',
          furniture: [],
          floorColor: '#c9a878',
          wallColor: '#efe8da',
          floorMaterial: 'matte',
          wallMaterial: 'matte',
        },
      ],
      activeProposalId: 'p1',
    },
  ],
  activeRoomId: 'room-1',
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript((p) => {
    localStorage.setItem('roomcraft:current', JSON.stringify({ state: { project: p }, version: 5 }));
  }, project);
  await page.goto('/');
});

/** Opens the seeded room from the lobby, landing on the furnish view's dock. */
async function openFurnishView(page: Page) {
  await page.locator('.room-card-main', { hasText: 'Touch Target Room' }).click();
  await expect(page.getByRole('button', { name: 'Add furniture' })).toBeVisible();
}

/** Every `.sel-action` pill currently on screen must clear the pointer-aware
 *  hit-area rule: >=44px on a coarse (touch) pointer, exactly the unchanged
 *  38px base height on a fine (mouse) pointer. Icon-only pills (no
 *  `.sel-label`) must also clear a >=44px *width* floor on a coarse pointer
 *  (#404) — labelled pills are already wider than 44px from their own
 *  icon + gap + text + padding, so they're excluded from the width
 *  assertion rather than asserted at some arbitrary larger minimum. */
async function expectPillsMeetTouchTarget(page: Page) {
  const isCoarse = await page.evaluate(() => window.matchMedia('(pointer: coarse)').matches);
  const pills = page.locator('.sel-action');
  const count = await pills.count();
  expect(count).toBeGreaterThan(0);

  for (let i = 0; i < count; i++) {
    const pill = pills.nth(i);
    const minHeight = await pill.evaluate((el) => parseFloat(getComputedStyle(el).minHeight));
    const minWidth = await pill.evaluate((el) => parseFloat(getComputedStyle(el).minWidth));
    const hasLabel = (await pill.locator('.sel-label').count()) > 0;
    if (isCoarse) {
      expect(minHeight).toBeGreaterThanOrEqual(44);
      const box = await pill.boundingBox();
      // boundingBox() is rasterised through the emulated device scale factor, so
      // a 44px min-height can come back as 43.9999… — sub-pixel jitter, not a
      // real shortfall. Allow a 0.5px tolerance: it still catches any genuine
      // regression (e.g. back to the 38px base) while ignoring that rounding.
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(43.5);
      if (!hasLabel) {
        expect(minWidth).toBeGreaterThanOrEqual(44);
        expect(box?.width ?? 0).toBeGreaterThanOrEqual(43.5);
      }
    } else {
      // Fine-pointer (mouse) behaviour must stay exactly as it was: 38px.
      expect(minHeight).toBe(38);
    }
  }
}

test('dock pills (ActionBar + HistoryBar) keep their pointer-aware touch target', async ({
  page,
}, testInfo) => {
  // Longer than the 30s default: this drives full room-view 3D rendering, which
  // runs slower under mobile emulation and can brush the default budget.
  test.setTimeout(90_000);
  await openFurnishView(page);
  // ActionBar's "Add furniture" pill and HistoryBar's undo/redo pills are both
  // on screen with no selection required. (Auto-arrange and AI suggestions
  // used to live in ActionBar too, but #170 moved them into the proposal
  // switcher's menu so this pill can never grow wide enough to collide with
  // the dock's middle contextual slot again — see ActionBar.tsx.)
  await expect(page.locator('.sel-action')).toHaveCount(3);
  await page.screenshot({
    path: `/tmp/sel-action-touch-target-${testInfo.project.name}.png`,
  });
  await expectPillsMeetTouchTarget(page);
});

// The dock family narrows its pill padding at these widths (src/index.css,
// ~656px/430px/400px) to keep every pill on one row on small phones. None of
// those rules touch min-height, but re-check at each one plus a wide baseline
// so a future narrow-width rule can't reintroduce the same cascade-order bug.
for (const width of [900, 656, 430, 400]) {
  test(`dock pills keep their touch target at ${width}px viewport width`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await openFurnishView(page);
    await expectPillsMeetTouchTarget(page);
  });
}

/**
 * Regression coverage for issue #386: the per-part colour swatch in the
 * furniture editor's "Colours & materials" section (`.color-field-chip`, see
 * FurnitureFields.tsx) is a fixed 22px round chip that never got the
 * coarse-pointer 44px floor its sibling `.sel-color` swatch already has. This
 * spec measures the real computed style — mirroring `expectPillsMeetTouchTarget`
 * above — rather than just eyeballing the screenshot, so a regression back to
 * the bare 22px chip can't silently slip in.
 */
test('per-part colour chip (.color-field-chip) keeps its pointer-aware touch target', async ({
  page,
}, testInfo) => {
  // The flow mounts the 3D scene and opens the furniture dialog on top of it —
  // WebGL under mobile Chrome emulation is slower, so give it headroom.
  test.setTimeout(60_000);

  // Reuse the seeded room from the file-level beforeEach above (rather than
  // the lobby's "Create a room" template flow) — this file's beforeEach
  // already has a room in localStorage, so the lobby never offers that empty
  // -state button.
  await openFurnishView(page);

  // A sofa splits into two parts (frame, cushions), landing directly in the
  // live edit form the appearance controls live in.
  await page.getByRole('button', { name: 'Add furniture' }).click();
  await page.getByRole('button', { name: 'Sofa', exact: true }).click();

  const dialog = page.getByRole('dialog', { name: 'Furniture settings' });
  await expect(dialog).toBeVisible();

  const chip = dialog.locator('input.color-field-chip[aria-label="Frame"]');
  await expect(chip).toBeVisible();

  await page.screenshot({
    path: `/tmp/color-chip-${testInfo.project.name}.png`,
  });

  const isCoarse = await page.evaluate(() => window.matchMedia('(pointer: coarse)').matches);
  const minWidth = await chip.evaluate((el) => parseFloat(getComputedStyle(el).minWidth));
  const minHeight = await chip.evaluate((el) => parseFloat(getComputedStyle(el).minHeight));

  if (isCoarse) {
    expect(minWidth).toBeGreaterThanOrEqual(44);
    expect(minHeight).toBeGreaterThanOrEqual(44);
    const box = await chip.boundingBox();
    // boundingBox() is rasterised through the emulated device scale factor, so
    // a 44px min-width/height can come back as 43.9999… — sub-pixel jitter, not
    // a real shortfall (same tolerance as expectPillsMeetTouchTarget above).
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(43.5);
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(43.5);
  } else {
    // Fine-pointer (mouse) behaviour must stay exactly as it was: the base rule
    // sets no min-width/min-height at all (computed style is the browser
    // default, e.g. "auto" — not "0px" — hence the NaN check), so the chip
    // stays the bare 22px round swatch.
    expect(Number.isNaN(minWidth) || minWidth === 0).toBe(true);
    expect(Number.isNaN(minHeight) || minHeight === 0).toBe(true);
    const box = await chip.boundingBox();
    expect(box?.width ?? 0).toBeCloseTo(22, 0);
    expect(box?.height ?? 0).toBeCloseTo(22, 0);
  }
});
