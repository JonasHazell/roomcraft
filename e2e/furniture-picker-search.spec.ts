import { test, expect } from '@playwright/test';

/**
 * Coverage for #225: the "Add furniture" picker's name search field. It filters
 * whichever tab (catalog or saved library) is currently shown, live as the user
 * types, case-insensitively, and shows a "No matches" empty state for a query
 * that matches nothing. Runs in both the `desktop` and `mobile` projects (see
 * playwright.config.ts).
 */

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

/** Walks the "New room" wizard to a furnished 3D view using a template shape. */
async function createRoomAndEnterFurnish(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: /create a room/i }).click();
  await expect(page.getByRole('heading', { name: /name your room/i })).toBeVisible();
  await page.getByLabel(/room name/i).fill('Search test room');
  await page.getByRole('button', { name: /^next/i }).click();

  // Walls step: pick a ready-made shape instead of drawing by hand.
  await page.getByRole('button', { name: /living room/i }).click();
  await expect(page.getByRole('button', { name: /^next/i })).toBeEnabled();
  await page.getByRole('button', { name: /^next/i }).click();

  // Openings step: skip straight to finishing the room.
  await page.getByRole('button', { name: /create room/i }).click();
  await expect(page.getByRole('button', { name: 'Add furniture' })).toBeVisible();
}

test('the catalog tab filters by name and shows "No matches" for a query with no results', async ({
  page,
}) => {
  await createRoomAndEnterFurnish(page);

  await page.getByRole('button', { name: 'Add furniture' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add furniture' });
  await expect(dialog).toBeVisible();

  const search = page.getByLabel('Search furniture', { exact: true });
  await expect(search).toBeVisible();

  // A matching, case-insensitive substring query narrows the catalog down to
  // just the matching kind(s).
  await search.fill('cha');
  await expect(page.getByRole('button', { name: 'Chair', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Bed', exact: true })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Sofa', exact: true })).toBeHidden();

  // A query with no matches shows the empty state instead of an empty list.
  await search.fill('zzznotarealthing');
  await expect(page.getByText('No matches')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Chair', exact: true })).toBeHidden();

  // Clearing the query restores the full catalog.
  await search.fill('');
  await expect(page.getByRole('button', { name: 'Chair', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Bed', exact: true })).toBeVisible();
});

test('the library tab filters saved pieces by name', async ({ page }) => {
  // A longer flow (place, save, reopen, switch tabs, type twice) than the
  // default 30s budget comfortably covers under parallel worker load — mirrors
  // the same allowance used by furniture-collision.spec.ts for its multi-step
  // flow, with extra headroom for the two search interactions at the end.
  test.setTimeout(120000);
  await createRoomAndEnterFurnish(page);

  // Place a chair and save it to the library so the "From library" tab has a
  // named entry to filter.
  await page.getByRole('button', { name: 'Add furniture' }).click();
  await page.getByRole('button', { name: 'Chair', exact: true }).click();
  const saveButton = page.getByRole('button', { name: 'Save to library' });
  await expect(saveButton).toBeVisible();
  await saveButton.click();
  // The button's visible label switches to "Saved to library" (its aria-label
  // stays fixed as "Save to library", so assert on the visible text here).
  await expect(page.getByText('Saved to library')).toBeVisible();
  await page.getByRole('button', { name: 'OK' }).click();

  // Reopen the picker on the library tab. The saved entry's accessible name is
  // its visible text ("Chair" + dimensions), not the button's tooltip title.
  await page.getByRole('button', { name: 'Add furniture' }).click();
  await page.getByRole('tab', { name: 'From library' }).click();
  const savedEntry = page.getByRole('button', { name: /^Chair/ });
  await expect(savedEntry).toBeVisible();

  const search = page.getByLabel('Search furniture', { exact: true });

  // Matching query keeps the saved piece visible.
  await search.fill('chair');
  await expect(savedEntry).toBeVisible();

  // Non-matching query shows the empty state, not the "no saved furniture yet"
  // hint (which only applies when the library itself is empty).
  await search.fill('sofa');
  await expect(page.getByText('No matches')).toBeVisible();
  await expect(savedEntry).toBeHidden();
});
