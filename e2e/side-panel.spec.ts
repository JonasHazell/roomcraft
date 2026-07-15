import { test, expect } from '@playwright/test';

/**
 * The right-hand `.side-panel` (AI / validation) is documented in `src/index.css`
 * as "a floating card on the right of the 3D viewport" that "doesn't cover the
 * scene, so validation highlights ... stay visible while the panel is open". At
 * mobile widths that means a near-full-width sheet (there's no room for anything
 * else); at desktop widths it should read as a genuine sidebar docked to the
 * right, with the room clearly visible beside it — see issue #201.
 *
 * This spec drives the real create-room flow into the 3D furnishing view, opens
 * the validation panel (no AI/network round-trip needed), and asserts the panel's
 * width against the viewport it's actually running in — this file runs in both
 * the `desktop` (1280×720) and `mobile` (393×727) Playwright projects, so the
 * same assertions double as the "narrow viewport is unchanged" regression check.
 */

const MOBILE_WIDTH_BREAKPOINT = 768;

test('creates a room and opens the validation side panel', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: /create a room/i }).click();
  await expect(page.getByRole('heading', { name: /name your room/i })).toBeVisible();

  // Name step: keep the pre-filled default and advance.
  await page.getByRole('button', { name: /^next/i }).click();

  // Walls step: pick a ready-made shape instead of drawing by hand.
  await page.getByRole('button', { name: /small room/i }).click();
  await expect(page.getByRole('button', { name: /^next/i })).toBeEnabled();
  await page.getByRole('button', { name: /^next/i }).click();

  // Openings step: finish straight into the 3D furnishing view.
  await page.getByRole('button', { name: /create room/i }).click();

  // The always-visible score badge is the entry point into the validation panel;
  // its accessible name always ends with "open validation".
  const scoreBadge = page.getByRole('button', { name: /open validation/i });
  await expect(scoreBadge).toBeVisible();
  await scoreBadge.click();

  const panel = page.getByRole('complementary', { name: 'Validation' });
  await expect(panel).toBeVisible();

  const viewportSize = page.viewportSize();
  if (!viewportSize) throw new Error('expected a viewport size');
  const panelBox = await panel.boundingBox();
  if (!panelBox) throw new Error('expected the side panel to have a bounding box');

  if (viewportSize.width > MOBILE_WIDTH_BREAKPOINT) {
    // Desktop: the panel reads as a docked sidebar, not a sheet covering the room.
    expect(panelBox.width).toBeLessThanOrEqual(420);
    expect(panelBox.width).toBeGreaterThan(300);

    // The room (the `.viewport` canvas underneath) is visible for everything left
    // of the panel's left edge — a meaningful chunk of the desktop viewport.
    const roomVisibleWidth = panelBox.x;
    expect(roomVisibleWidth).toBeGreaterThan(viewportSize.width * 0.5);
  } else {
    // Mobile/narrow: unchanged near-full-width sheet — a small inset on both
    // sides, same as before this change.
    expect(panelBox.width).toBeGreaterThan(viewportSize.width - 40);
  }
});
