import { test, expect } from '@playwright/test';

/**
 * #383: `NumberField`'s `commit` parsed a typed value and passed it straight to
 * `onChange` — the `min`/`max` props were only ever applied as advisory HTML
 * attributes, never enforced on the committed value. Typing "-20" into a
 * furniture Width field (min={5}) used to commit a negative width; typing
 * "9999" (max={2000}) used to commit a piece the size of the room. The wall
 * Length field (min={10} max={3000}) had the same gap, and `resizeWall` itself
 * had no upper bound at all, so an unbounded value could also reach the store
 * directly (not just via a typed value).
 *
 * `NumberField.commit` now clamps into [min, max] before calling `onChange`,
 * and `resizeWall` clamps to its own upper bound as a second line of defence.
 */

const project = {
  schemaVersion: 5,
  name: 'My rooms',
  updatedAt: new Date().toISOString(),
  rooms: [
    {
      id: 'room-1',
      name: 'Clamp room',
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

test('a furniture dimension clamps to its declared min/max instead of committing an out-of-range value', async ({
  page,
}) => {
  test.setTimeout(60_000);

  // The card's main tap target opens the (already-drawn) room straight into
  // the furnish view; there's no separate "Furnish" button on the lobby card.
  await page.locator('.room-card-main', { hasText: 'Clamp room' }).click();
  await expect(page.getByRole('button', { name: 'Add furniture' })).toBeVisible();

  await page.getByRole('button', { name: 'Add furniture' }).click();
  await page.getByRole('button', { name: 'Sofa', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Furniture settings' })).toBeVisible();

  const width = page.getByLabel('Width'); // declared min={5} max={2000} in FurnitureFields.tsx

  // A negative value must clamp up to the declared minimum, not commit as-is.
  await width.click();
  await width.pressSequentially('-20');
  await width.press('Enter');
  await expect(width).toHaveValue('5');

  // An absurdly large value must clamp down to the declared maximum.
  await width.click();
  await width.pressSequentially('9999');
  await width.press('Enter');
  await expect(width).toHaveValue('2000');
});

test('the wall Length field clamps to its declared min/max instead of committing an out-of-range value', async ({
  page,
}) => {
  test.setTimeout(60_000);

  await page
    .locator('.room-card', { hasText: 'Clamp room' })
    .getByRole('button', { name: 'Edit plan' })
    .click();
  await expect(page.getByRole('button', { name: 'Done · back to your rooms' })).toBeVisible();

  // Select a wall so its edit panel (with the Length field) appears.
  const wallHits = page.locator('.wall-hit');
  const length = page.getByLabel('Length');
  const count = await wallHits.count();
  for (let i = 0; i < count; i++) {
    const box = await wallHits.nth(i).boundingBox();
    if (!box) continue;
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    if (await length.count()) break;
  }
  await expect(length).toBeVisible(); // declared min={10} max={3000} in PlanWallPanel.tsx

  // A value below the minimum must clamp up, not shrink the wall to almost nothing.
  await length.click();
  await length.pressSequentially('1');
  await length.press('Enter');
  await expect(length).toHaveValue('10');

  // An absurdly large value must clamp down to the declared maximum, not inflate
  // a 4x5m room's wall to ~1000m.
  await length.click();
  await length.pressSequentially('99999');
  await length.press('Enter');
  await expect(length).toHaveValue('3000');
});
