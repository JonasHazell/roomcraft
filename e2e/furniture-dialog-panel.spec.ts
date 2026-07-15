import { test, expect } from '@playwright/test';

/**
 * Regression coverage for #200: opening the furniture dialog while a side panel
 * (AI/validation) is open must dismiss the panel, not just cover it — otherwise
 * it reappears over the 3D room the instant the dialog closes. Mirrors the
 * existing rule that a new object selection dismisses a competing panel
 * (`useUiStore.select`); `openAddFurniture`/`openEditFurniture` now do the same.
 *
 * Runs in both the `desktop` and `mobile` projects (see playwright.config.ts).
 */

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

/** Walks the "New room" wizard to a furnished 3D view using a template shape. */
async function createRoomAndEnterFurnish(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: /create a room/i }).click();
  await expect(page.getByRole('heading', { name: /name your room/i })).toBeVisible();
  await page.getByRole('button', { name: /^next/i }).click();

  // Walls step: pick a ready-made shape instead of drawing by hand.
  await page.getByRole('button', { name: /small room/i }).click();
  await expect(page.getByRole('button', { name: /^next/i })).toBeEnabled();
  await page.getByRole('button', { name: /^next/i }).click();

  // Openings step: skip straight to finishing the room.
  await page.getByRole('button', { name: /create room/i }).click();
  await expect(page.getByRole('button', { name: 'Add furniture' })).toBeVisible();
}

test('opening the add-furniture dialog dismisses an open side panel for good', async ({
  page,
}) => {
  await createRoomAndEnterFurnish(page);

  // Open the validation side panel.
  await page.getByRole('button', { name: /open validation/i }).click();
  const panel = page.getByRole('complementary', { name: 'Validation' });
  await expect(panel).toBeVisible();

  // Opening the furniture dialog on top of it must dismiss the panel, not just
  // cover it.
  await page.getByRole('button', { name: 'Add furniture' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add furniture' });
  await expect(dialog).toBeVisible();
  await expect(panel).toBeHidden();

  // Closing the dialog must not reveal a resurrected panel over the room.
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(panel).toBeHidden();
});
