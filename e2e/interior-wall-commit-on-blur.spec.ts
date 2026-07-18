import { test, expect } from '@playwright/test';

/**
 * #363: the interior wall's "From left"/"From top" position field applied
 * every keystroke live (via `moveWall`), so typing a new value jittered the
 * wall through each intermediate digit and recorded a history entry per
 * keystroke — unlike every other numeric field in the same panel (Length, and
 * every opening field), which already use `commitOnBlur`.
 *
 * Observable signatures of commitOnBlur on a NumberField: focus selects the
 * whole value (so one typed digit replaces it), and Enter commits.
 */

const project = {
  schemaVersion: 5,
  name: 'My rooms',
  updatedAt: new Date().toISOString(),
  rooms: [
    {
      id: 'room-1',
      name: 'Split room',
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
        { id: 'iw1', kind: 'interior', a: { x: 0, z: -2.5 }, b: { x: 0, z: 2.5 } },
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

test('interior wall From-left field commits on blur/Enter, not per keystroke', async ({ page }) => {
  test.setTimeout(60_000);

  await page
    .locator('.room-card', { hasText: 'Split room' })
    .getByRole('button', { name: 'Edit plan' })
    .click();
  await expect(page.getByRole('button', { name: 'Done · back to your rooms' })).toBeVisible();

  // Click the interior wall's hit line (vertical, centred) to select it.
  const wallHits = page.locator('.wall-hit');
  const fromLeft = page.getByLabel('From left');
  const count = await wallHits.count();
  for (let i = 0; i < count; i++) {
    const box = await wallHits.nth(i).boundingBox();
    if (!box) continue;
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    if (await fromLeft.count()) break;
  }
  await expect(fromLeft).toBeVisible();

  const original = await fromLeft.inputValue();
  expect(original.length).toBeGreaterThanOrEqual(2); // e.g. "200"

  // Focus selects all (commitOnBlur only), so one digit replaces the value.
  await fromLeft.click();
  await fromLeft.pressSequentially('5');
  await expect(fromLeft).toHaveValue('5');

  // Enter commits; the value sticks.
  await fromLeft.press('Enter');
  await expect(fromLeft).toHaveValue('5');
});
