import { test, expect } from '@playwright/test';

/**
 * The unified "New room" flow that replaced the old multi-step wizard: creating a
 * room now opens straight in the plan editor, where naming, drawing and adding
 * doors/windows all happen on one surface before furnishing in 3D. This spec
 * drives that whole path — and the "draw it yourself" branch — in both the
 * desktop and mobile projects (see playwright.config.ts).
 */

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('new room: name inline, pick a shape, then furnish — all on one surface', async ({ page }) => {
  await page.getByRole('button', { name: /create a room/i }).click();

  // Lands directly in the plan editor: no wizard, the shape chooser is the empty
  // state, and the room name is editable right there in the top bar.
  await expect(page.locator('.plan-chooser')).toBeVisible();
  const nameField = page.getByLabel(/room name/i);
  await nameField.fill('Studio');

  // Pick a ready shape: the chooser fills in the outline and hands off to select
  // mode, where the ceiling-height chip and the tools appear.
  await page.getByRole('button', { name: /small room/i }).click();
  await expect(page.locator('.plan-chooser')).toHaveCount(0);
  await expect(page.locator('.plan-room-panel')).toBeVisible();

  // "Furnish this room" carries the same room into the 3D view.
  await page.getByRole('button', { name: /furnish this room/i }).click();
  await expect(page.getByRole('button', { name: 'Add furniture' })).toBeVisible();
  // The name typed on the way in follows the room into 3D.
  await expect(page.locator('.room-topbar-name')).toHaveText('Studio');
});

test('new room: "draw it yourself" dismisses the chooser and arms the canvas', async ({ page }) => {
  await page.getByRole('button', { name: /create a room/i }).click();
  await expect(page.locator('.plan-chooser')).toBeVisible();

  // Choosing to draw by hand clears the chooser and brings the tool dock forward.
  await page.getByRole('button', { name: /draw it yourself/i }).click();
  await expect(page.locator('.plan-chooser')).toHaveCount(0);
  await expect(page.locator('.plan-dock')).toBeVisible();
});

test('a new room left undrawn is discarded, not saved to the lobby', async ({ page }) => {
  await page.getByRole('button', { name: /create a room/i }).click();
  await expect(page.locator('.plan-chooser')).toBeVisible();

  // Leaving before any outline exists throws the provisional room away.
  await page.getByRole('button', { name: /back to your rooms/i }).click();
  await expect(page.getByRole('heading', { name: /create your first room/i })).toBeVisible();
});
