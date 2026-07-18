import { test, expect } from '@playwright/test';

/**
 * Baseline smoke coverage for the core RoomCraft flows. It runs in both the
 * `desktop` and `mobile` projects (see playwright.config.ts), so every assertion
 * here is checked in a desktop browser AND on a phone viewport.
 *
 * This is the floor, not the ceiling: when you build or change a feature, add a
 * spec here (or in a sibling file) that drives it, so the change is validated in
 * both modes. The Stop hook (scripts/require-e2e-validation.mjs) blocks finishing
 * while UI changes under src/ are unvalidated.
 *
 * A fresh browser context has empty localStorage, so the app boots into the empty
 * workspace — a deterministic starting point that needs no backend.
 */

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('lobby shows the empty-workspace call to action', async ({ page }) => {
  await expect(page.getByRole('heading', { name: /create your first room/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /create a room/i })).toBeVisible();
});

test('creating a room opens straight in the plan editor with the shape chooser', async ({
  page,
}) => {
  await page.getByRole('button', { name: /create a room/i }).click();

  // No wizard, no naming step: we land directly on the plan editor. An undrawn
  // room shows its shape chooser as the empty state, and the room name is
  // editable inline in the top bar — a signal that holds in both layouts.
  await expect(page.locator('.plan-chooser')).toBeVisible();
  const nameField = page.getByLabel(/room name/i);
  await expect(nameField).toBeVisible();
  await nameField.fill('Test Room');
  await expect(nameField).toHaveValue('Test Room');
});

test('leaving a new room without drawing returns to the lobby', async ({ page }) => {
  await page.getByRole('button', { name: /create a room/i }).click();
  await expect(page.locator('.plan-chooser')).toBeVisible();

  // "Done" with nothing drawn discards the provisional room and returns home.
  await page.getByRole('button', { name: /back to your rooms/i }).click();
  await expect(page.getByRole('heading', { name: /create your first room/i })).toBeVisible();
});

test('the style-guide gallery renders shared primitives', async ({ page }) => {
  await page.goto('/#styleguide');
  await expect(page.locator('.btn').first()).toBeVisible();
});
