import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

/**
 * Regression coverage for #248: on the new-room wizard's "doors & windows"
 * step, the floor-plan editor's top-centre guidance pill (`.plan-hint-pill`,
 * PlanToolbar.tsx) used to overlap the top-right ceiling-height/floor-area
 * chip (`.plan-room-panel`, PlanRoomPanel.tsx), clipping the ceiling-height
 * label. `src/index.css` already pushed the chip down 52px below the pill for
 * this step (`.plan-wizard-openings .plan-room-panel`), but that offset
 * assumed a single-line pill — this step's hint copy ("...set the ceiling
 * height, top-right") wraps onto two lines below ~630px, growing the pill
 * past the reserved clearance and re-creating the overlap on real phone
 * widths. The fix adds a `max-width: 656px` rule (reusing the dock's existing
 * breakpoint) that gives the chip more headroom exactly where the hint wraps.
 *
 * This spec drives the real wizard to the openings step and asserts the two
 * elements' actual computed bounding boxes — not just a visual check — stay
 * vertically clear of each other, at the two narrow widths the issue named
 * (390px, 430px) and at a desktop width where the layout was already fine.
 */

const MEDIA_DIR = '.github/pr-media/agent/issue-248-mobile-hint-pill-overlap';

/** Builds a room from the "Small room" template and advances to the wizard's
 *  openings step, where both `.plan-hint-pill` and `.plan-room-panel` render
 *  together. */
async function reachOpeningsStep(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: /create a room/i }).click();
  await page.getByRole('button', { name: /^next/i }).click();
  await page.getByRole('button', { name: /small room/i }).click();
  await page.getByRole('button', { name: /^next/i }).click();

  // The hint pill's openings-step copy mentions the ceiling height — a
  // reliable, visible signal (unlike `.wizard-foot-title`, which is hidden by
  // its own narrow-width rule) that we've actually landed on this step.
  await expect(page.locator('.plan-hint-pill')).toContainText(/ceiling height/i);
}

/** Reads both elements' bounding boxes and asserts the pill sits entirely
 *  above the chip — the stacked layout the fix produces — logging the actual
 *  geometry so a run's console output can be cited directly. */
async function expectPillClearOfPanel(page: Page, label: string): Promise<void> {
  const pill = page.locator('.plan-hint-pill');
  const panel = page.locator('.plan-room-panel');
  await expect(pill).toBeVisible();
  await expect(panel).toBeVisible();

  const pillBox = await pill.boundingBox();
  const panelBox = await panel.boundingBox();
  if (!pillBox || !panelBox) throw new Error('hint pill or room panel not measurable');

  console.log(
    `[${label}] hint pill: y ${pillBox.y.toFixed(1)}-${(pillBox.y + pillBox.height).toFixed(1)} | ` +
      `room panel: y ${panelBox.y.toFixed(1)}-${(panelBox.y + panelBox.height).toFixed(1)}`,
  );

  expect(pillBox.y + pillBox.height).toBeLessThanOrEqual(panelBox.y);
}

// The issue's own repro viewport — forced explicitly (on top of the desktop
// and mobile *projects*, see playwright.config.ts) so the overlap geometry is
// checked at the exact narrow width that used to break, in both a mouse-driven
// and a touch-driven browser context.
test.describe('narrow viewport (390x844, the issue repro size)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('the hint pill and ceiling-height chip no longer overlap', async ({ page }, testInfo) => {
    await reachOpeningsStep(page);
    await expectPillClearOfPanel(page, `${testInfo.project.name}, 390x844`);

    mkdirSync(MEDIA_DIR, { recursive: true });
    await page.screenshot({ path: `${MEDIA_DIR}/${testInfo.project.name}-390-openings-step.png` });
  });
});

// The other narrow breakpoint MOBILE-FIRST.md/index.css already use elsewhere
// (dock gap/padding tightening) — confirms the fix isn't a one-viewport fluke.
test.describe('a second narrow width (430px, also named in the issue)', () => {
  test.use({ viewport: { width: 430, height: 900 } });

  test('the hint pill and ceiling-height chip still do not overlap', async ({ page }, testInfo) => {
    await reachOpeningsStep(page);
    await expectPillClearOfPanel(page, `${testInfo.project.name}, 430x900`);
  });
});

test.describe('desktop viewport (1440x900, no regression)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('the hint pill and ceiling-height chip stay clear of each other', async ({ page }, testInfo) => {
    await reachOpeningsStep(page);
    await expectPillClearOfPanel(page, `${testInfo.project.name}, 1440x900`);

    mkdirSync(MEDIA_DIR, { recursive: true });
    await page.screenshot({ path: `${MEDIA_DIR}/${testInfo.project.name}-1440-openings-step.png` });
  });
});
