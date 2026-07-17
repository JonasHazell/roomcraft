import { test, expect } from '@playwright/test';

/**
 * #293: the AI entry point in the "Furnishing proposals" menu read
 * "★ 3 AI suggestions", which is easy to misread as a count of results that
 * already exist rather than an action that generates three layouts. It now
 * reads "★ Suggest 3 layouts" — an unambiguous call to action.
 */

const project = {
  schemaVersion: 5,
  name: 'My rooms',
  updatedAt: new Date().toISOString(),
  rooms: [
    {
      id: 'room-1',
      name: 'Sunroom',
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

test('the AI entry point reads as an action, not a count of existing results', async ({
  page,
}, testInfo) => {
  // Into the 3D furnish view for the seeded, already-drawn room.
  await page
    .locator('.room-card', { hasText: 'Sunroom' })
    .getByRole('button', { name: 'Edit plan' })
    .click();
  await page.getByRole('button', { name: 'Furnish this room' }).click();
  await expect(page.getByRole('button', { name: 'Add furniture' })).toBeVisible();

  // Open the "Furnishing proposals" menu that hosts the AI entry point.
  await page.locator('.proposal-pill').click();
  await expect(page.getByRole('menu', { name: 'Furnishing proposals' })).toBeVisible();

  // The reworded, unambiguous label is present; the old count-like one is gone.
  await expect(page.getByRole('button', { name: 'Suggest 3 layouts' })).toBeVisible();
  await expect(page.getByRole('button', { name: '3 AI suggestions' })).toHaveCount(0);

  await page.screenshot({ path: `/tmp/pr-293-${testInfo.project.name}.png` });
});
