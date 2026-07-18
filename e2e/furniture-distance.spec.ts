import { test, expect } from '@playwright/test';

/**
 * The furniture distance readout (#199): when a piece is selected, the
 * properties panel shows a read-only "N cm to wall · N cm to nearest piece"
 * line — the touch-friendly, relative-measurement alternative to exact X/Z
 * position fields the human asked for after rejecting #153 (see
 * docs/AGENT_LEARNINGS.md). Runs in both the `desktop` and `mobile` projects.
 *
 * Builds a room from the "Bedroom" template (fast, no manual wall-drawing),
 * then drives the same "Add furniture" flow the app already uses to select and
 * edit a freshly placed piece — picking a kind lands directly in the edit form
 * this readout lives in.
 */

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('shows distance to wall and nearest piece when furniture is selected', async ({ page }) => {
  // The full flow mounts the 3D scene twice (once per furniture dialog round
  // trip); the mobile Chrome emulation renders WebGL noticeably slower than
  // desktop, so this needs more headroom than the 30s default.
  test.setTimeout(60_000);

  // Build a room from a template — fast, no manual wall-drawing needed.
  await page.getByRole('button', { name: /create a room/i }).click();
  await page.getByRole('button', { name: /^bedroom/i }).click();
  await page.getByRole('button', { name: /furnish this room/i }).click();

  // Add the first piece: with no other furniture yet, only the wall distance shows.
  await page.getByRole('button', { name: 'Add furniture' }).click();
  await page.getByRole('button', { name: 'Sofa', exact: true }).click();

  await expect(page.getByRole('dialog', { name: 'Furniture settings' })).toBeVisible();
  const distanceField = page.locator('.field-static').filter({ hasText: /cm to wall/i });
  await expect(distanceField).toBeVisible();
  await expect(distanceField).toHaveText(/^\d[\d\s]* cm to wall$/);
  await expect(distanceField).not.toHaveText(/nearest piece/i);

  // Commit the sofa, then add a second piece — now both distances show.
  await page.getByRole('button', { name: 'OK', exact: true }).click();
  await page.getByRole('button', { name: 'Add furniture' }).click();
  await page.getByRole('button', { name: 'Chair', exact: true }).click();

  await expect(page.getByRole('dialog', { name: 'Furniture settings' })).toBeVisible();
  const bothDistances = page.locator('.field-static').filter({ hasText: /cm to wall/i });
  await expect(bothDistances).toHaveText(/^\d[\d\s]* cm to wall · \d[\d\s]* cm to nearest piece$/);
});
