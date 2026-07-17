import { test, expect } from '@playwright/test';

/**
 * #289: `FurnishView` used to render a `.viewport-hint` element that was
 * `display: none` at every width with no code path to ever surface it — dead
 * markup and dead CSS. This confirms the 3D furnish view still renders after
 * the removal and that the element is gone from the DOM, in both viewports.
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

test('the 3D furnish view renders and no longer contains the dead viewport-hint', async ({
  page,
}) => {
  await page
    .locator('.room-card', { hasText: 'Sunroom' })
    .getByRole('button', { name: 'Edit plan' })
    .click();
  await page.getByRole('button', { name: 'Furnish this room' }).click();

  // The furnish view is up and interactive...
  await expect(page.getByRole('button', { name: 'Add furniture' })).toBeVisible();
  // ...and the removed element is nowhere in the DOM.
  await expect(page.locator('.viewport-hint')).toHaveCount(0);
});
