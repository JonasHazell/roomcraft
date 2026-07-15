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

test('the new-room wizard opens and advances to drawing walls', async ({ page }) => {
  await page.getByRole('button', { name: /create a room/i }).click();

  // Step 1 — name the room.
  await expect(page.getByRole('heading', { name: /name your room/i })).toBeVisible();
  await page.getByLabel(/room name/i).fill('Test Room');

  // Advance to step 2 — drawing the walls. We've left the naming step, and the
  // walls step keeps Next disabled until an outline is drawn — a signal that
  // holds in both desktop and mobile layouts.
  await page.getByRole('button', { name: /^next/i }).click();
  await expect(page.getByRole('heading', { name: /name your room/i })).toBeHidden();
  await expect(page.getByRole('button', { name: /^next/i })).toBeDisabled();
});

test('the wizard can be cancelled back to the lobby', async ({ page }) => {
  await page.getByRole('button', { name: /create a room/i }).click();
  await expect(page.getByRole('heading', { name: /name your room/i })).toBeVisible();

  // On the first step, "Cancel" leaves nothing behind (no outline drawn yet).
  // Exact match avoids the close button, whose label starts with "Cancel".
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('heading', { name: /create your first room/i })).toBeVisible();
});

test('the style-guide gallery renders shared primitives', async ({ page }) => {
  await page.goto('/#styleguide');
  await expect(page.locator('.btn').first()).toBeVisible();
});
