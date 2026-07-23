import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

/**
 * Regression coverage for #405: the in-room top bar (`.room-topbar` — back ·
 * keyboard shortcuts · print/export, independently positioned `left: 14px`) and
 * the proposal switcher (`.proposal-switcher`, independently centred via
 * `left: 50%`) both want the very top of the 3D view. With a second proposal
 * present the switcher's flanking ‹/› arrows become enabled, and on a narrow
 * phone viewport the top bar's rendered width can reach far enough right to sit
 * under the switcher's left edge — with the bar's higher z-index, a tap meant
 * for the switcher's "previous" arrow instead resolves to the bar (in practice,
 * the keyboard-shortcuts button). `src/index.css` now drops the switcher a row
 * below the bar at tablet width and under (the same `max-width: 768px` guard
 * `.plan-topbar` already uses against `.plan-hint-pill`/`.plan-room-panel`), so
 * they stack instead of colliding.
 *
 * This spec builds a room, adds a second proposal (so both arrows are enabled —
 * a single proposal never shows them, and the switcher itself is hidden
 * entirely until furniture-mode is reached), and asserts the two elements'
 * bounding boxes never intersect at the issue's own repro width, plus that a
 * real tap at the previous arrow's on-screen position both resolves to the
 * switcher (not the top bar) and actually switches proposals.
 */

const MEDIA_DIR = '.github/pr-media/agent/issue-405-topbar-switcher-overlap';

/** Creates a small room, furnishes it, and adds a second (empty) proposal so
 *  the switcher's prev/next arrows are enabled. */
async function reachTwoProposals(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: /create a room/i }).click();
  await page.getByRole('button', { name: /small room/i }).click();
  await page.getByRole('button', { name: /furnish this room/i }).click();
  await expect(page.locator('.proposal-switcher')).toBeVisible();

  // A single proposal leaves both arrows disabled — open the switcher menu and
  // add a second one so they become enabled, the state the repro needs.
  await page.locator('.proposal-pill').click();
  await page.getByRole('button', { name: /new empty/i }).click();
  await expect(page.getByRole('button', { name: 'Previous proposal' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Next proposal' })).toBeEnabled();
}

test.describe('narrow viewport (390x844, the issue repro size)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('the top bar and proposal switcher never overlap or steal taps', async ({
    page,
  }, testInfo) => {
    await reachTwoProposals(page);

    const topbar = page.locator('.room-topbar');
    const switcher = page.locator('.proposal-switcher');
    await expect(topbar).toBeVisible();
    await expect(switcher).toBeVisible();

    const t = await topbar.boundingBox();
    const s = await switcher.boundingBox();
    if (!t || !s) throw new Error('topbar or switcher not measurable');

    console.log(
      `[${testInfo.project.name}, 390x844] ` +
        `topbar: x ${t.x.toFixed(1)}-${(t.x + t.width).toFixed(1)} y ${t.y.toFixed(1)}-${(t.y + t.height).toFixed(1)} | ` +
        `switcher: x ${s.x.toFixed(1)}-${(s.x + s.width).toFixed(1)} y ${s.y.toFixed(1)}-${(s.y + s.height).toFixed(1)}`,
    );

    // No shared vertical band at all — the switcher sits fully below the bar,
    // so any x-overlap can never be painted over regardless of z-index.
    expect(s.y).toBeGreaterThanOrEqual(t.y + t.height);

    // The previous arrow keeps a real ≥44px touch target even in its new spot.
    const prevArrow = page.getByRole('button', { name: 'Previous proposal' });
    const arrowBox = await prevArrow.boundingBox();
    if (!arrowBox) throw new Error('previous arrow not measurable');
    expect(arrowBox.width).toBeGreaterThanOrEqual(44);
    expect(arrowBox.height).toBeGreaterThanOrEqual(44);

    // A tap at the previous arrow's own centre must resolve to the switcher,
    // not the top bar — the exact failure mode the issue reports (a tap meant
    // for "previous" instead landing on "Keyboard shortcuts").
    const hit = await page.evaluate(
      ([x, y]) => {
        const el = document.elementFromPoint(x, y);
        if (el?.closest('.proposal-switcher')) return 'switcher';
        if (el?.closest('.room-topbar')) return 'topbar';
        return 'other';
      },
      [arrowBox.x + arrowBox.width / 2, arrowBox.y + arrowBox.height / 2] as [number, number],
    );
    expect(hit).toBe('switcher');

    // Functional check, not just geometry: the shortcuts modal must stay
    // closed and the active proposal must actually change.
    const nameBefore = await page.locator('.proposal-pill-name').innerText();
    await prevArrow.click();
    await expect(page.getByLabel('Shortcuts and gestures')).toHaveCount(0);
    await expect(page.locator('.proposal-pill-name')).not.toHaveText(nameBefore);

    mkdirSync(MEDIA_DIR, { recursive: true });
    await page.screenshot({ path: `${MEDIA_DIR}/${testInfo.project.name}-390.png` });
  });
});

test.describe('desktop viewport (1440x900)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('the top bar and proposal switcher stay clear of each other (no regression)', async ({
    page,
  }, testInfo) => {
    await reachTwoProposals(page);

    const topbar = page.locator('.room-topbar');
    const switcher = page.locator('.proposal-switcher');
    await expect(topbar).toBeVisible();
    await expect(switcher).toBeVisible();

    const t = await topbar.boundingBox();
    const s = await switcher.boundingBox();
    if (!t || !s) throw new Error('topbar or switcher not measurable');

    console.log(
      `[${testInfo.project.name}, 1440x900] ` +
        `topbar: x ${t.x.toFixed(1)}-${(t.x + t.width).toFixed(1)} y ${t.y.toFixed(1)}-${(t.y + t.height).toFixed(1)} | ` +
        `switcher: x ${s.x.toFixed(1)}-${(s.x + s.width).toFixed(1)} y ${s.y.toFixed(1)}-${(s.y + s.height).toFixed(1)}`,
    );

    const overlapX = t.x < s.x + s.width && s.x < t.x + t.width;
    const overlapY = t.y < s.y + s.height && s.y < t.y + t.height;
    expect(overlapX && overlapY).toBe(false);

    // Confirms this fix is scoped to narrow viewports: the switcher keeps its
    // original top offset (12px + safe-area-inset-top) on the topbar's own row
    // rather than the mobile media query's dropped position.
    const top = await switcher.evaluate((el) => parseFloat(getComputedStyle(el).top));
    console.log(`[${testInfo.project.name}, 1440x900] switcher computed top: ${top.toFixed(1)}px`);
    expect(top).toBeLessThan(30);

    mkdirSync(MEDIA_DIR, { recursive: true });
    await page.screenshot({ path: `${MEDIA_DIR}/${testInfo.project.name}-1440.png` });
  });
});
