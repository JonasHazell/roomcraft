import { test, expect } from '@playwright/test';

/**
 * Regression coverage for #226: a saved furniture library entry keeps
 * whatever name it had when placed (the catalog label, e.g. "Sofa") with no
 * way to rename it afterward, so saving several pieces of the same kind
 * produces indistinguishable entries in the library list.
 *
 * This drives the whole loop end to end: place a piece, save it to the
 * library, open the library tab, rename the saved entry via the new control
 * (reusing the same `promptDialog` pattern as the lobby's room rename, see
 * Lobby.tsx), and confirm the new name replaces the old one in the list.
 * `useLibraryStore.rename` writes synchronously through to the
 * localStorage-backed library (persistence.ts's `renameFurnitureInLibrary`),
 * so the list re-render asserted here reflects the real persisted state, not
 * just local component state.
 *
 * Runs in both the `desktop` and `mobile` projects (see playwright.config.ts).
 */

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

/** Walks the New room flow to a furnished 3D view using a template shape. */
async function createRoomAndEnterFurnish(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: /create a room/i }).click();

  // Pick a ready-made shape instead of drawing by hand.
  await page.getByRole('button', { name: /small room/i }).click();

  // Head straight into the furnish view.
  await page.getByRole('button', { name: /furnish this room/i }).click();
  await expect(page.getByRole('button', { name: 'Add furniture' })).toBeVisible();
}

test('a saved library entry can be renamed and the new name persists', async ({ page }) => {
  // Longer than the 30s default: this drives a full dialog open/close cycle
  // plus 3D room rendering, which runs slower under mobile emulation.
  test.setTimeout(90_000);
  await createRoomAndEnterFurnish(page);

  // Place a sofa, then save it to the library from the live-editing footer.
  await page.getByRole('button', { name: 'Add furniture' }).click();
  await page.getByRole('button', { name: 'Sofa', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Save to library' })).toBeVisible();
  await page.getByRole('button', { name: 'Save to library' }).click();
  // The button's accessible name stays "Save to library" (fixed aria-label), but
  // its visible label swaps to a "Saved to library" confirmation.
  await expect(page.getByText('Saved to library')).toBeVisible();
  await page.getByRole('button', { name: 'OK' }).click();

  // Reopen the picker and switch to the saved library.
  await page.getByRole('button', { name: 'Add furniture' }).click();
  await page.getByRole('tab', { name: 'From library' }).click();
  const renameBtn = page.getByRole('button', { name: 'Rename Sofa' });
  await expect(renameBtn).toBeVisible();

  // Rename via the new control — same promptDialog pattern as the lobby's room rename.
  await renameBtn.click();
  const renameDialog = page.getByRole('dialog', { name: 'Rename saved piece' });
  await expect(renameDialog).toBeVisible();
  await expect(renameDialog.getByLabel('Name')).toHaveValue('Sofa');
  await renameDialog.getByLabel('Name').fill('Living room sofa');
  await renameDialog.getByRole('button', { name: 'Save' }).click();
  await expect(renameDialog).toBeHidden();

  // The library entry now shows the new name, and the old control is gone.
  await expect(page.getByRole('button', { name: 'Rename Living room sofa' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Rename Sofa' })).toHaveCount(0);
  await expect(page.getByText('Living room sofa')).toBeVisible();
});
