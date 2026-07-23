import { test, expect } from '@playwright/test';

/**
 * #403: the room panel's "Ceiling height" field applied every keystroke live
 * (via `setRoom`, which reclamps every opening's height/elevation to fit the
 * new ceiling — see `roomSlice.ts`'s `setRoom` and `clampOpeningIn`), unlike
 * every other field in the app whose live value drives that same kind of
 * destructive recalculation (wall length/position and door/window fields in
 * `PlanWallPanel.tsx`, furniture dimension fields in `FurnitureFields.tsx`),
 * which all use `commitOnBlur`. So typing a new ceiling height one digit at a
 * time momentarily set the ceiling to whatever the first digit clamped to,
 * which permanently shrank a window sitting close to the ceiling before the
 * user finished typing — the field now uses `commitOnBlur` too.
 *
 * This test protects the actual boundary the fix guards, not just the
 * generic commitOnBlur signature: a window within 10cm of the ceiling must
 * keep its exact original height/elevation while the ceiling-height field is
 * mid-edit, and only reclamp once a real, finished value is committed.
 */

const project = {
  schemaVersion: 5,
  name: 'My rooms',
  updatedAt: new Date().toISOString(),
  rooms: [
    {
      id: 'room-1',
      name: 'Windowed',
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
      // Sits 10cm below the 250cm ceiling (elevation 150 + height 90 = 240) —
      // exactly the near-ceiling repro case from the issue.
      openings: [
        { id: 'win1', kind: 'window', wallId: 'w1', offset: 1.5, width: 1.2, height: 0.9, elevation: 1.5 },
      ],
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

test('ceiling height field commits on blur/Enter, keeping a near-ceiling window intact mid-edit', async ({
  page,
}) => {
  test.setTimeout(60_000);

  await page
    .locator('.room-card', { hasText: 'Windowed' })
    .getByRole('button', { name: 'Edit plan' })
    .click();
  await expect(page.getByRole('button', { name: 'Done · back to your rooms' })).toBeVisible();

  // Select the wall carrying the window so its fields expand in the wall panel.
  const wallHits = page.locator('.wall-hit');
  const openingSummary = page.locator('.opening-summary');
  const count = await wallHits.count();
  for (let i = 0; i < count; i++) {
    const box = await wallHits.nth(i).boundingBox();
    if (!box) continue;
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    if (await openingSummary.count()) break;
  }
  await expect(openingSummary.first()).toBeVisible();
  await openingSummary.first().click(); // expand the window's fields

  const windowHeight = page.getByLabel('Height', { exact: true });
  const windowFloorHeight = page.getByLabel('Floor height');
  await expect(windowHeight).toHaveValue('90');
  await expect(windowFloorHeight).toHaveValue('150');

  const ceiling = page.getByLabel('Ceiling height');
  await expect(ceiling).toHaveValue('250');

  // Focus selects all (commitOnBlur only), so the first typed digit replaces
  // the whole value instead of momentarily committing a partial one.
  await ceiling.click();
  await ceiling.pressSequentially('2'); // first char of an intended "220"
  await expect(ceiling).toHaveValue('2');

  // The window must be untouched while the ceiling edit is still in progress —
  // this is the exact regression: before the fix, this keystroke alone fired
  // `setRoom`, which reclamped the window's height down to fit a momentarily
  // tiny (clamped-to-minimum) ceiling.
  await expect(windowHeight).toHaveValue('90');
  await expect(windowFloorHeight).toHaveValue('150');

  // Finish typing the intended value and commit it.
  await ceiling.pressSequentially('20');
  await expect(ceiling).toHaveValue('220');
  await expect(windowHeight).toHaveValue('90'); // still untouched, pre-commit
  await ceiling.press('Enter');

  // Now that a real, finished value has been committed, the ceiling applies
  // and the window correctly reclamps to fit it (220cm ceiling − 150cm floor
  // height leaves only 70cm of headroom, below the original 90cm) — the fix
  // only defers the recalculation to commit time, it doesn't disable it.
  await expect(ceiling).toHaveValue('220');
  await expect(windowFloorHeight).toHaveValue('150');
  await expect(windowHeight).toHaveValue('70');
});
