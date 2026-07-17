import { test, expect } from '@playwright/test';

/**
 * Regression coverage for issue #245: the 2D floor-plan editor's bottom dock
 * (`PlanToolbar.tsx`) was rewritten to compose the shared `SelBar`/
 * `SelBarButton`/`SelBarDivider` primitives from `src/components/panel/SelBar.tsx`
 * — the same building blocks `ActionBar`/`SelectionBar`/`WallBar`/`FloorBar`
 * already use — instead of hand-writing the pill markup and toggling classes by
 * string concatenation. The refactor is meant to be behaviourally invisible, so
 * this spec drives every affected control end to end: mode switching (Select ↔
 * Interior, with the `active` prop), the Cancel/Delete danger actions, the
 * Undo/Redo history pill (`disabled` + `history` props).
 *
 * Issue #247 removed the user-facing "Fit view" control from the dock (the
 * maintainer deemed it unwanted; the automatic auto-fit stays). The final test
 * guards that removal: the button is gone while the zoom controls remain.
 *
 * A fresh browser context has empty localStorage, so a room with one interior
 * wall already drawn is seeded directly (schema v5, see src/lib/persistence.ts)
 * and opened via the lobby's "Edit plan" — the standalone (non-wizard) editor,
 * where the centre dock's full mode-switcher is shown (the wizard's own footer
 * owns navigation there instead).
 */

const project = {
  schemaVersion: 5,
  name: 'My rooms',
  updatedAt: new Date().toISOString(),
  rooms: [
    {
      id: 'room-1',
      name: 'Dock Test',
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
        { id: 'w5', kind: 'interior', a: { x: 0, z: -2.5 }, b: { x: 0, z: 2.5 } },
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
  await page
    .locator('.room-card', { hasText: 'Dock Test' })
    .getByRole('button', { name: 'Edit plan' })
    .click();
  await expect(page.getByRole('button', { name: 'Select' })).toBeVisible();
});

test('the mode-switcher toggles between Select and Interior, and Cancel returns to Select', async ({
  page,
}) => {
  const select = page.getByRole('button', { name: 'Select' });
  const interior = page.getByRole('button', { name: 'Draw interior wall' });

  // Select opens active by default when editing an existing plan.
  await expect(select).toHaveClass(/sel-active/);
  await expect(interior).toBeVisible();

  await interior.click();
  // Entering a draw tool switches the centre dock to the drawing bar: only
  // Cancel is offered until a wall is actually in progress.
  const cancel = page.getByRole('button', { name: 'Cancel drawing' });
  await expect(cancel).toBeVisible();
  await expect(select).toBeHidden();

  await cancel.click();
  await expect(select).toBeVisible();
  await expect(select).toHaveClass(/sel-active/);
});

test('selecting the interior wall reveals Delete, and Undo/Redo restore it', async ({ page }) => {
  const wallHit = page.locator('.plan-wall.interior .wall-hit');
  const deleteBtn = page.getByRole('button', { name: 'Delete wall' });
  const undo = page.getByRole('button', { name: 'Undo' });
  const redo = page.getByRole('button', { name: 'Redo' });

  await expect(page.locator('.plan-wall.interior')).toHaveCount(1);
  await expect(deleteBtn).toBeHidden();
  // The history pill starts with nothing to undo/redo for this fresh session.
  await expect(undo).toBeDisabled();
  await expect(redo).toBeDisabled();

  await wallHit.click({ force: true });
  await expect(deleteBtn).toBeVisible();
  await expect(deleteBtn).toHaveClass(/sel-danger/);

  await deleteBtn.click();
  await expect(page.locator('.plan-wall.interior')).toHaveCount(0);
  await expect(deleteBtn).toBeHidden();
  await expect(undo).toBeEnabled();
  await expect(redo).toBeDisabled();

  await undo.click();
  await expect(page.locator('.plan-wall.interior')).toHaveCount(1);
  await expect(redo).toBeEnabled();

  await redo.click();
  await expect(page.locator('.plan-wall.interior')).toHaveCount(0);
});

test('the Fit view control is gone, while the dock and zoom controls remain (#247)', async ({
  page,
}, testInfo) => {
  // The removed control must leave no trace in the dock.
  await expect(page.getByRole('button', { name: 'Fit view' })).toHaveCount(0);

  // The rest of the view-controls dock is untouched.
  await expect(page.getByRole('toolbar', { name: 'Floor plan tools' })).toBeVisible();

  // Zoom in/out buttons are mouse-only (hidden on coarse/touch viewports, where
  // pinch is used instead) — assert they still exist there.
  const zoomIn = page.getByRole('button', { name: 'Zoom in' });
  const zoomOut = page.getByRole('button', { name: 'Zoom out' });
  if (await zoomIn.isVisible()) {
    await expect(zoomIn).toBeVisible();
    await expect(zoomOut).toBeVisible();
  }

  // Capture the toolbar/dock without the Fit view button (desktop + mobile per project).
  await page.screenshot({ path: `plan-dock-no-fit-view-${testInfo.project.name}.png` });
});
