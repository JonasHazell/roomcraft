import { test, expect } from '@playwright/test';

/**
 * Selection dimension runs: when a furniture piece is selected, the 3D view draws
 * dashed clearance runs from its footprint out to the nearest walls and pieces,
 * each labelled with the gap (`.dim-label`, see
 * `src/components/scene/SelectionDimensions.tsx`). This replaces the old read-only
 * "N cm to wall · N cm to nearest piece" line that used to live in the furniture
 * dialog — so this spec also guards that the numeric readout is gone. Runs in both
 * the `desktop` and `mobile` projects.
 *
 * Builds a room from the "Bedroom" template (fast, no manual wall-drawing), then
 * drives the same "Add furniture" flow the app already uses — picking a kind
 * places the piece and leaves it selected.
 */

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('shows dashed dimension labels in the 3D view for the selected piece', async ({ page }) => {
  // The full flow mounts the 3D scene several times (once per furniture dialog
  // round trip); the mobile Chrome emulation renders WebGL noticeably slower than
  // desktop, so this needs more headroom than the 30s default.
  test.setTimeout(60_000);

  // Build a room from a template — fast, no manual wall-drawing needed.
  await page.getByRole('button', { name: /create a room/i }).click();
  await expect(page.getByRole('heading', { name: /name your room/i })).toBeVisible();
  await page.getByRole('button', { name: /^next/i }).click();

  await page.getByRole('button', { name: /^bedroom/i }).click();
  await page.getByRole('button', { name: /^next/i }).click();
  await page.getByRole('button', { name: /create room/i }).click();

  // Add a piece, then commit it — it stays selected, with only the selection bar
  // (not the dialog) over the scene.
  await page.getByRole('button', { name: 'Add furniture' }).click();
  await page.getByRole('button', { name: 'Sofa', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Furniture settings' })).toBeVisible();
  await page.getByRole('button', { name: 'OK', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Duplicate' })).toBeVisible();

  // The room bounds the piece on every side, so clearance runs to the walls are
  // drawn and labelled with a measurement.
  const labels = page.locator('.dim-label');
  await expect(labels.first()).toBeVisible();
  await expect(labels.filter({ hasText: /\d+\s*cm/ }).first()).toBeVisible();

  // The old numeric readout must be gone from the "More" dialog.
  await page.getByRole('button', { name: 'More settings' }).click();
  const dialog = page.getByRole('dialog', { name: 'Furniture settings' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/to wall/i)).toHaveCount(0);
  await expect(dialog.getByText(/nearest piece/i)).toHaveCount(0);
  await dialog.getByRole('button', { name: 'OK', exact: true }).click();
  await expect(dialog).toBeHidden();

  // Add a second piece so the selected one now has a neighbour to measure to —
  // this drives the piece-to-piece run at runtime. Labels stay drawn.
  await page.getByRole('button', { name: 'Add furniture' }).click();
  await page.getByRole('button', { name: 'Chair', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Furniture settings' })).toBeVisible();
  await page.getByRole('button', { name: 'OK', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Duplicate' })).toBeVisible();
  await expect(labels.first()).toBeVisible();

  // Removing the piece deselects it, so the runs clear with the selection.
  await page.getByRole('button', { name: 'Delete' }).click();
  await expect(page.locator('.dim-label')).toHaveCount(0);
});
