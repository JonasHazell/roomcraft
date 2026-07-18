import { test, expect } from '@playwright/test';

/**
 * Coverage for the "never a blank page" empty-room prompt (#325): a first-time
 * user who creates a room lands in an empty 3D furnish view and must see a calm,
 * dismissible nudge with the two "get help furnishing" actions, which then
 * vanishes once the room has any furniture.
 *
 * Runs in both the `desktop` and `mobile` projects (see playwright.config.ts), so
 * the prompt is validated at both widths — and each project captures its own
 * screenshot of the prompt.
 */

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

/**
 * Drives the unified plan surface (which replaced the old multi-step wizard, see
 * #342) from the empty workspace into a freshly-created empty 3D furnish view:
 * create → pick a ready shape → furnish.
 */
async function createRoomIntoFurnishView(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: /create a room/i }).click();

  // Pick a ready-made shape so the outline is filled in without hand-drawing on
  // the canvas, then carry the room into the 3D furnish view.
  await page.getByRole('button', { name: /small room/i }).click();
  await page.getByRole('button', { name: /furnish this room/i }).click();
}

test('the empty furnish view shows the never-a-blank-page prompt', async ({ page }, testInfo) => {
  await createRoomIntoFurnishView(page);

  // The prompt is visible with its invitation and both actions.
  const prompt = page.locator('.empty-room-prompt');
  await expect(prompt).toBeVisible();
  await expect(prompt.getByText(/furnish this room/i)).toBeVisible();
  await expect(prompt.getByRole('button', { name: /suggest 3 layouts/i })).toBeVisible();
  await expect(prompt.getByRole('button', { name: /browse furniture/i })).toBeVisible();

  // Capture the prompt in this project's viewport (desktop and mobile write
  // distinct files, keyed off the project name).
  await page.screenshot({ path: `e2e-artifacts/issue-325-empty-${testInfo.project.name}.png` });
});

test('"Add furniture" opens the picker and adding a piece dismisses the prompt', async ({
  page,
}) => {
  await createRoomIntoFurnishView(page);

  const prompt = page.locator('.empty-room-prompt');
  await expect(prompt).toBeVisible();

  // The prompt's "Browse furniture" opens the same picker as the dock's + pill.
  await prompt.getByRole('button', { name: /browse furniture/i }).click();
  const picker = page.getByRole('dialog', { name: /add furniture/i });
  await expect(picker).toBeVisible();
  // While the picker owns the screen the prompt steps aside.
  await expect(prompt).toBeHidden();

  // Place a piece, then commit its just-placed edit session.
  await picker.getByRole('button', { name: /^bed$/i }).click();
  await page.getByRole('button', { name: /^ok$/i }).click();

  // The room now has furniture, so the prompt is gone and stays gone.
  await expect(prompt).toBeHidden();
  await expect(page.getByText(/furnish this room/i)).toBeHidden();
});

test('the empty-room prompt can be dismissed', async ({ page }) => {
  await createRoomIntoFurnishView(page);

  const prompt = page.locator('.empty-room-prompt');
  await expect(prompt).toBeVisible();

  await prompt.getByRole('button', { name: /dismiss/i }).click();
  await expect(prompt).toBeHidden();
});
