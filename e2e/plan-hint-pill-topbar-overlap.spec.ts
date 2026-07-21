import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

/**
 * #364: the interior-wall drawing hint (`.plan-hint-pill`) is the one instruction
 * that tells a first-time user how the tool works, so it must be fully legible —
 * especially on mobile, the app's default target (docs/MOBILE-FIRST.md). On a
 * narrow viewport the pill is centred across the whole screen width while
 * `.plan-topbar` (back button · editable room name · Furnish action) occupies the
 * same top band on the left; the topbar's higher z-index then painted over the
 * start of the hint text.
 *
 * `src/index.css` now drops the whole top guidance cluster (`.plan-hint-pill`,
 * `.plan-error-pill`, `.plan-length-input`) below the top bar's height at
 * `max-width: 768px` — the same breakpoint `.plan-room-panel` already uses for the
 * identical reason (see the neighbouring rule in index.css) — so they can never
 * share the topbar's band, only stack below it. Desktop (which has room beside the
 * toolbar) keeps its original centred position.
 *
 * This spec drives the exact repro: create a room from a template, switch to the
 * Interior tool, and assert the full hint text renders with no horizontal overlap
 * against `.plan-topbar`'s bounding box, at a 390px mobile width and unaffected at
 * desktop width.
 */

const MEDIA_DIR = '.github/pr-media/agent/issue-364-hint-pill-mobile-overlap';

/** Creates a room from the "Small room" template and switches to the Interior
 *  wall-drawing tool, where the guidance hint pill renders. */
async function reachInteriorHint(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: /create a room/i }).click();
  await page.getByRole('button', { name: /small room/i }).click();
  await page.getByRole('button', { name: /draw interior wall/i }).click();
  await expect(page.locator('.plan-hint-pill')).toBeVisible();
}

/** Asserts the hint pill's full text is present and legible: it renders (not just
 *  exists in the DOM, but is on-screen) and its bounding box clears the top bar's
 *  vertical band entirely, i.e. the topbar's higher z-index can never paint over
 *  any of it — the fix drops the whole pill below that band on narrow viewports. */
async function expectHintClearOfTopbar(page: Page, label: string): Promise<void> {
  const topbar = page.locator('.plan-topbar');
  const hint = page.locator('.plan-hint-pill');
  await expect(topbar).toBeVisible();
  await expect(hint).toBeVisible();
  // The full instruction, not a truncated fragment — this is the text a
  // first-time user must be able to read end to end. Both the mouse and
  // touch wordings (PlanEditor.tsx's HINTS/TOUCH_HINTS) share these phrases
  // from the start and the end of the string, so this holds on desktop
  // (mouse) and mobile (touch, coarse pointer) alike.
  await expect(hint).toContainText(/press, drag out the wall, release to/i);
  await expect(hint).toContainText(/retype its length/i);

  const t = await topbar.boundingBox();
  const h = await hint.boundingBox();
  if (!t || !h) throw new Error('topbar or hint pill not measurable');

  console.log(
    `[${label}] topbar: x ${t.x.toFixed(1)}-${(t.x + t.width).toFixed(1)} y ${t.y.toFixed(1)}-${(t.y + t.height).toFixed(1)} | ` +
      `hint: x ${h.x.toFixed(1)}-${(h.x + h.width).toFixed(1)} y ${h.y.toFixed(1)}-${(h.y + h.height).toFixed(1)}`,
  );

  // No shared vertical band at all — the pill sits fully below the bar, so any
  // x-overlap (its own width can still reach under where the bar would be) can
  // never be painted over, regardless of the bar's z-index.
  expect(h.y).toBeGreaterThanOrEqual(t.y + t.height);
}

/** Confirms this fix is scoped to narrow viewports: at desktop width the hint
 *  pill keeps its original, centred top offset (~14px + safe-area-inset-top,
 *  i.e. unshifted) rather than the mobile media query's dropped position — the
 *  `max-width: 768px` rule in index.css must not fire here. This is a narrower,
 *  more accurate claim than "never overlaps the top bar": at this width the app
 *  already renders a pre-existing few-pixel sliver graze between the pill's
 *  centred max-width and the top bar's own width (present identically on `main`,
 *  unrelated to and unmoved by this fix) — not something this issue asks to fix,
 *  and not perceptible as clipped text (it falls entirely within the pill's own
 *  padding, short of its lettering). */
async function expectDesktopPositionUnshifted(page: Page, label: string): Promise<void> {
  const hint = page.locator('.plan-hint-pill');
  await expect(hint).toBeVisible();
  await expect(hint).toContainText(/press, drag out the wall, release to/i);
  await expect(hint).toContainText(/retype its length/i);

  const top = await hint.evaluate((el) => parseFloat(getComputedStyle(el).top));
  console.log(`[${label}] hint computed top: ${top.toFixed(1)}px`);
  // The mobile media query moves it to 76px; well clear of that confirms it
  // never engaged at this width.
  expect(top).toBeLessThan(30);
}

test.describe('narrow viewport (390x844)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('the interior-wall hint pill is fully legible, clear of the top bar', async ({
    page,
  }, testInfo) => {
    await reachInteriorHint(page);
    await expectHintClearOfTopbar(page, `${testInfo.project.name}, 390x844`);

    mkdirSync(MEDIA_DIR, { recursive: true });
    await page.screenshot({ path: `${MEDIA_DIR}/${testInfo.project.name}-390.png` });
  });
});

test.describe('desktop viewport (1440x900)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('the interior-wall hint pill keeps its original centred position', async ({
    page,
  }, testInfo) => {
    await reachInteriorHint(page);
    await expectDesktopPositionUnshifted(page, `${testInfo.project.name}, 1440x900`);

    mkdirSync(MEDIA_DIR, { recursive: true });
    await page.screenshot({ path: `${MEDIA_DIR}/${testInfo.project.name}-1440.png` });
  });
});
