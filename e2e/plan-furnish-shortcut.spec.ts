import { test, expect } from '@playwright/test';

/**
 * Regression coverage for issue #228: the plan editor's topbar (outside the
 * "New room" wizard) offers a second, explicit "Furnish this room" action next
 * to "Done", so a quick wall tweak on an already-furnished room doesn't force a
 * detour through the lobby. The two controls must read as distinct, always-
 * visible actions — not one control that silently branches on hidden state
 * (see docs/AGENT_LEARNINGS.md's #127 lesson) — and "Done" must keep doing
 * exactly what it did before: return to the lobby.
 *
 * A fresh browser context has empty localStorage, so we seed one already-drawn
 * room directly (schema v5, see src/lib/persistence.ts) and open its floor
 * plan via the lobby's "Edit plan" action — the standalone entry point this
 * issue is about, not the wizard's own (unchanged) navigation.
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

/** Opens the seeded room's floor plan from the lobby, outside the wizard. */
async function openPlanEditor(page: import('@playwright/test').Page) {
  await page
    .locator('.room-card', { hasText: 'Sunroom' })
    .getByRole('button', { name: 'Edit plan' })
    .click();
  await expect(page.getByRole('button', { name: 'Done · back to your rooms' })).toBeVisible();
}

test('the plan editor topbar shows Done and Furnish this room as two distinct, visible actions', async ({
  page,
}) => {
  await openPlanEditor(page);
  await expect(page.getByRole('button', { name: 'Done · back to your rooms' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Furnish this room' })).toBeVisible();
});

test('Furnish this room jumps straight into the 3D view for the same room', async ({ page }) => {
  await openPlanEditor(page);
  await page.getByRole('button', { name: 'Furnish this room' }).click();

  // Lands directly in the furnish (3D) surface — not the lobby.
  await expect(page.getByRole('button', { name: 'Add furniture' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Roomcraft' })).toBeHidden();
  // For the same room that was being edited, not a different one.
  await expect(page.locator('.room-topbar-name')).toHaveText('Sunroom');
});

test('Done still returns to the lobby, unchanged', async ({ page }) => {
  await openPlanEditor(page);
  await page.getByRole('button', { name: 'Done · back to your rooms' }).click();

  await expect(page.getByRole('heading', { name: 'Roomcraft' })).toBeVisible();
  await expect(page.locator('.room-card', { hasText: 'Sunroom' })).toBeVisible();
});
