import { test, expect } from '@playwright/test';

/**
 * Regression coverage for #223: clicking a validation finding tied to exactly
 * one furniture piece must select that piece — opening its editing surface (the
 * bottom "Furniture actions" toolbar, reachable from there via "More" for the
 * full properties form) — not just highlight it in the 3D view. Before this
 * fix, `ValidationPanel`'s finding click always called `select(null)`, so the
 * user had to spot the highlight (possibly off-screen) and click the piece a
 * second time to actually edit it.
 *
 * A bed placed at the center of a small room is never against a wall, which
 * deterministically trips rule ERG-08 ("Headboard against a solid wall") with
 * a single-piece violation (`furnitureIds: [bed.id]`) — a reliable, easy to
 * reach single-piece finding that needs no AI round-trip.
 *
 * Runs in both the `desktop` and `mobile` Playwright projects.
 */

test('clicking a single-piece validation finding selects and opens that piece for editing', async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.goto('/');

  // Build a small room — a bed placed at its center sits well clear of every
  // wall, so ERG-08 always fires.
  await page.getByRole('button', { name: /create a room/i }).click();
  await page.getByRole('button', { name: /small room/i }).click();
  await page.getByRole('button', { name: /furnish this room/i }).click();

  // Add a bed and place it at the room's default (centered) position — the
  // "pick -> place -> tweak" flow hands off straight to the edit surface.
  await page.getByRole('button', { name: 'Add furniture' }).click();
  await page.getByRole('button', { name: 'Bed', exact: true }).click();
  await page.getByRole('button', { name: 'OK', exact: true }).click();

  // Deselect so the bed starts out neither selected nor highlighted — the
  // toolbar for it must be gone before the validation click brings it back.
  const toolbar = page.getByRole('toolbar', { name: 'Furniture actions' });
  await expect(toolbar).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(toolbar).toBeHidden();

  // Open the validation panel and find the single-piece headboard finding.
  await page.getByRole('button', { name: /open validation/i }).click();
  const panel = page.getByRole('complementary', { name: 'Validation' });
  await expect(panel).toBeVisible();
  const finding = page.getByRole('button', { name: /headboard/i });
  await expect(finding).toBeVisible();

  // One click both highlights the piece in 3D (existing behaviour, unchanged)
  // and now also selects it, landing the user straight on its editing
  // surface — the same toolbar that appears when clicking the piece directly
  // in the 3D view.
  await finding.click();
  await expect(toolbar).toBeVisible();

  // Selecting an object dismisses a competing side panel by existing design
  // (see `useUiStore.select`), so the validation list itself steps aside for
  // the newly opened editing surface rather than the two fighting for space.
  await expect(panel).toBeHidden();

  // Only one piece exists in the room, so the now-visible toolbar (and its
  // "More" button, which opens the full properties form) can only be for the
  // bed the finding was about — the click landed the user on the actual fix,
  // not just a highlight they still have to go find.
  await expect(page.getByRole('button', { name: 'More settings' })).toBeVisible();
});
