import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

/**
 * Regression coverage for the unified plan editor's top band. The top-left bar
 * (`.plan-topbar` — back · editable room name · Furnish this room) and the
 * top-right ceiling-height/floor-area chip (`.plan-room-panel`) both want the top
 * of the canvas. With the room name now editable inline in the bar, on narrow
 * viewports the bar can reach across toward the chip — so `src/index.css` drops
 * the chip a row below the bar at tablet width and under (`max-width: 768px`),
 * stacking them instead of letting them collide. On wide viewports there's room
 * for both side by side.
 *
 * This spec builds a room from a template (which lands in select mode, where the
 * chip renders) and asserts the two elements' actual bounding boxes never
 * intersect, at the narrow widths phones use and at a desktop width.
 */

const MEDIA_DIR = '.github/pr-media/agent/plan-topbar-panel-overlap';

/** Creates a room, picks the "Small room" template, and lands in select mode —
 *  where both `.plan-topbar` and `.plan-room-panel` render together. */
async function reachSelectMode(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: /create a room/i }).click();
  await page.getByRole('button', { name: /small room/i }).click();
  // The ceiling chip only renders in select mode; the template pick switches to it.
  await expect(page.locator('.plan-room-panel')).toBeVisible();
}

/** Reads both elements' bounding boxes and asserts they do not intersect,
 *  logging the actual geometry so a run's console output can be cited directly. */
async function expectTopbarClearOfChip(page: Page, label: string): Promise<void> {
  const topbar = page.locator('.plan-topbar');
  const chip = page.locator('.plan-room-panel');
  await expect(topbar).toBeVisible();
  await expect(chip).toBeVisible();

  const t = await topbar.boundingBox();
  const c = await chip.boundingBox();
  if (!t || !c) throw new Error('topbar or ceiling chip not measurable');

  console.log(
    `[${label}] topbar: x ${t.x.toFixed(1)}-${(t.x + t.width).toFixed(1)} y ${t.y.toFixed(1)}-${(t.y + t.height).toFixed(1)} | ` +
      `chip: x ${c.x.toFixed(1)}-${(c.x + c.width).toFixed(1)} y ${c.y.toFixed(1)}-${(c.y + c.height).toFixed(1)}`,
  );

  // No intersection: they clear each other on at least one axis (stacked
  // vertically on narrow screens, side by side on wide ones).
  const overlapX = t.x < c.x + c.width && c.x < t.x + t.width;
  const overlapY = t.y < c.y + c.height && c.y < t.y + t.height;
  expect(overlapX && overlapY).toBe(false);
}

test.describe('narrow viewport (390x844)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('the top bar and ceiling chip do not overlap', async ({ page }, testInfo) => {
    await reachSelectMode(page);
    await expectTopbarClearOfChip(page, `${testInfo.project.name}, 390x844`);

    mkdirSync(MEDIA_DIR, { recursive: true });
    await page.screenshot({ path: `${MEDIA_DIR}/${testInfo.project.name}-390.png` });
  });
});

test.describe('a second narrow width (430px)', () => {
  test.use({ viewport: { width: 430, height: 900 } });

  test('the top bar and ceiling chip still do not overlap', async ({ page }, testInfo) => {
    await reachSelectMode(page);
    await expectTopbarClearOfChip(page, `${testInfo.project.name}, 430x900`);
  });
});

test.describe('desktop viewport (1440x900)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('the top bar and ceiling chip stay clear of each other', async ({ page }, testInfo) => {
    await reachSelectMode(page);
    await expectTopbarClearOfChip(page, `${testInfo.project.name}, 1440x900`);

    mkdirSync(MEDIA_DIR, { recursive: true });
    await page.screenshot({ path: `${MEDIA_DIR}/${testInfo.project.name}-1440.png` });
  });
});
