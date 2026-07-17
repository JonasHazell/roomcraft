import { test, expect } from '@playwright/test';

/**
 * #271: the validation panel promises "Click an issue to highlight it in the 3D
 * view," but several rules produce violations with no furnitureIds and no zones
 * (e.g. ACC-13 over-furnished, ACC-02 turning space) — clicking those rows
 * highlighted nothing, a dead click. Rows with nothing to highlight now render
 * as plain, non-interactive items; only rows the 3D overlay can actually show
 * something for stay clickable buttons.
 *
 * We seed a heavily over-furnished bedroom, which reliably fires both kinds of
 * violation: piece-anchored ones (interactive) and whole-room ones like ACC-13
 * (nothing to highlight → non-interactive).
 */

function box(id: string, x: number, z: number) {
  return {
    id,
    kind: 'box',
    name: 'Box',
    position: { x, z },
    rotationY: 0,
    size: { width: 1.9, depth: 2.3, height: 0.8 },
    elevation: 0,
    color: '#8a8a8a',
  };
}

const furniture = [
  {
    id: 'bed-1',
    kind: 'bed',
    name: 'Bed',
    position: { x: 0, z: -0.5 },
    rotationY: 0,
    size: { width: 1.6, depth: 2, height: 0.5 },
    elevation: 0,
    color: '#8a8a8a',
  },
  box('box-1', -0.9, -1),
  box('box-2', 0.9, 1),
  box('box-3', -0.6, 1.6),
];

const project = {
  schemaVersion: 5,
  name: 'My rooms',
  updatedAt: new Date().toISOString(),
  rooms: [
    {
      id: 'room-1',
      name: 'Crowded',
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
      furniture,
      proposals: [
        {
          id: 'p1',
          name: 'Proposal 1',
          furniture,
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

test('rows with nothing to highlight are not clickable; highlightable rows are buttons', async ({
  page,
}) => {
  await page
    .locator('.room-card', { hasText: 'Crowded' })
    .getByRole('button', { name: 'Edit plan' })
    .click();
  await page.getByRole('button', { name: 'Furnish this room' }).click();

  await page.getByRole('button', { name: /open validation/i }).click();
  const panel = page.getByRole('complementary', { name: 'Validation' });
  await expect(panel).toBeVisible();

  // There is at least one violation row.
  await expect(panel.locator('.validation-item').first()).toBeVisible();

  // At least one row has nothing to highlight — rendered as a plain div, never a button.
  await expect(panel.locator('div.validation-item-static').first()).toBeVisible();
  await expect(panel.locator('button.validation-item-static')).toHaveCount(0);

  // At least one row IS highlightable — a real button.
  await expect(panel.locator('button.validation-item').first()).toBeVisible();
});
