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
 * driving the multi-step room wizard's freehand wall-drawing canvas — this
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
 *  38px base height on a fine (mouse) pointer. */
async function expectPillsMeetTouchTarget(page: Page) {
  const isCoarse = await page.evaluate(() => window.matchMedia('(pointer: coarse)').matches);
  const pills = page.locator('.sel-action');
  const count = await pills.count();
  expect(count).toBeGreaterThan(0);

  for (let i = 0; i < count; i++) {
    const pill = pills.nth(i);
    const minHeight = await pill.evaluate((el) => parseFloat(getComputedStyle(el).minHeight));
    if (isCoarse) {
      expect(minHeight).toBeGreaterThanOrEqual(44);
      const box = await pill.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    } else {
      // Fine-pointer (mouse) behaviour must stay exactly as it was: 38px.
      expect(minHeight).toBe(38);
    }
  }
}

test('dock pills (ActionBar + HistoryBar) keep their pointer-aware touch target', async ({ page }) => {
  await openFurnishView(page);
  // ActionBar's single "Add furniture" pill (Auto-arrange and AI suggestions
  // moved into the proposal-switcher menu in #170) and HistoryBar's undo/redo
  // pills are both on screen with no selection required.
  await expect(page.locator('.sel-action')).toHaveCount(3);
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
