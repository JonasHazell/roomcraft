import { test, expect } from '@playwright/test';

/**
 * #286: a door/window's "From start"/Width/Height/"Floor height" fields in the
 * wall panel applied every keystroke live, so a half-typed number transiently
 * reclamped the opening (and nearby furniture) once per digit — the same jank
 * the wall Length field in the same panel was already fixed for. They now use
 * `commitOnBlur`, applying the value only on blur/Enter.
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
      name: 'Doored',
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
      openings: [
        { id: 'd1', kind: 'door', wallId: 'w1', offset: 1.5, width: 0.9, height: 2.1, elevation: 0 },
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

test('opening fields commit on blur/Enter, not per keystroke', async ({ page }) => {
  test.setTimeout(60_000);

  await page
    .locator('.room-card', { hasText: 'Doored' })
    .getByRole('button', { name: 'Edit plan' })
    .click();
  await expect(page.getByRole('button', { name: 'Done · back to your rooms' })).toBeVisible();

  // Select each wall until the one carrying the door opens a panel with an
  // opening summary. The hit line is invisible, so click its bbox centre.
  const wallHits = page.locator('.wall-hit');
  const count = await wallHits.count();
  const openingSummary = page.locator('.opening-summary');
  for (let i = 0; i < count; i++) {
    const box = await wallHits.nth(i).boundingBox();
    if (!box) continue;
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    if (await openingSummary.count()) break;
  }
  await expect(openingSummary.first()).toBeVisible();
  await openingSummary.first().click(); // expand the door's fields

  const fromStart = page.getByLabel('From start');
  const original = await fromStart.inputValue();
  expect(original.length).toBeGreaterThanOrEqual(2); // e.g. "150"

  // Focus selects all (commitOnBlur only), so one digit replaces the value.
  await fromStart.click();
  await fromStart.pressSequentially('7');
  await expect(fromStart).toHaveValue('7');

  // Enter commits; the value sticks.
  await fromStart.press('Enter');
  await expect(fromStart).toHaveValue('7');
});
