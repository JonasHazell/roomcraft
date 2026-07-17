import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Coverage for #252: the create→edit hand-off modal (the piece placed from the
 * picker, now being tweaked) must stay short enough on MOBILE to leave the room
 * and the just-placed piece visible above it — matching FurnitureDialog's own
 * stated intent ("so the room and the new piece are visible immediately").
 *
 * The same flow on DESKTOP must be unchanged: the modal stays its normal centred
 * size. One spec, both viewports (see playwright.config.ts) — we branch on the
 * viewport to assert the mobile-only presentation without duplicating the walk.
 *
 * Screenshots are written per-project so scripts/pr-media.mjs can attach the
 * mobile (short sheet, piece visible) and desktop (unchanged) captures to the PR.
 */

const MEDIA_DIR = join(process.cwd(), 'pr-media-out');

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

/** Walks the "New room" wizard to a furnished 3D view using a template shape. */
async function createRoomAndEnterFurnish(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: /create a room/i }).click();
  await expect(page.getByRole('heading', { name: /name your room/i })).toBeVisible();
  await page.getByRole('button', { name: /^next/i }).click();

  // Walls step: pick a ready-made shape instead of drawing by hand.
  await page.getByRole('button', { name: /living room/i }).click();
  await expect(page.getByRole('button', { name: /^next/i })).toBeEnabled();
  await page.getByRole('button', { name: /^next/i }).click();

  // Openings step: skip straight to finishing the room.
  await page.getByRole('button', { name: /create room/i }).click();
  await expect(page.getByRole('button', { name: 'Add furniture' })).toBeVisible();
}

test('the create→edit hand-off keeps the placed piece visible on mobile, unchanged on desktop', async ({
  page,
}, testInfo) => {
  await createRoomAndEnterFurnish(page);

  // Place a sofa from the picker; the dialog hands off straight to the live
  // editing surface for the just-placed piece.
  await page.getByRole('button', { name: 'Add furniture' }).click();
  await page.getByRole('button', { name: 'Sofa', exact: true }).click();

  const editDialog = page.getByRole('dialog', { name: 'Furniture settings' });
  await expect(editDialog).toBeVisible();

  // The hand-off carries the scoped presentation modifier (mobile-only in CSS).
  await expect(editDialog).toHaveClass(/\bmodal-just-placed\b/);

  // Measure the ACTUAL rendered geometry rather than trusting the class alone.
  const rect = await editDialog.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, height: r.height, vh: window.innerHeight };
  });

  mkdirSync(MEDIA_DIR, { recursive: true });
  await page.screenshot({ path: join(MEDIA_DIR, `${testInfo.project.name}.png`) });

  if (testInfo.project.name === 'mobile') {
    // Short sheet: the modal covers well under two-thirds of the viewport, so a
    // meaningful upper band (where a centrally-placed piece appears) stays clear.
    expect(rect.height).toBeLessThan(rect.vh * 0.6);
    // Bottom-anchored, leaving the upper portion of the 3D view visible above it.
    expect(rect.top).toBeGreaterThan(rect.vh * 0.3);
    expect(rect.vh - rect.bottom).toBeLessThan(40);
  } else {
    // Desktop is unchanged: the modal stays vertically centred (space above ≈
    // space below), never pinned to the bottom as a short sheet.
    const above = rect.top;
    const below = rect.vh - rect.bottom;
    expect(Math.abs(above - below)).toBeLessThan(60);
    expect(below).toBeGreaterThan(40);
  }

  // The editing surface itself is present (hand-off worked, not just a resize).
  await expect(page.getByRole('button', { name: 'OK' })).toBeVisible();
});
