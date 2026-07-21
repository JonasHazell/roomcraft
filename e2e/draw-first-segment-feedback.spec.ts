import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';

/**
 * Regression coverage for #387: the plan editor's drawing tool (shared by the
 * exterior-outline and interior-wall tools, `PlanDraft.tsx`) gave a live
 * rubber-band preview for every segment except the first. A corner only
 * commits to `draft` on pointer *release* (so drawing works identically on
 * touch, which has no hover to preview from — see `PlanEditor.tsx`'s
 * `onPointerUp`), so during the very first press-drag `draft` was still
 * empty and there was no placed corner for the rubber band to run from —
 * only a hover dot followed the cursor, with no line showing where the wall
 * would actually run.
 *
 * The fix snapshots the press-down point as a `dragAnchor` the moment the
 * first segment's gesture starts (`PlanEditor`'s `drawGestureRef`), and
 * `PlanDraft` now previews the rubber band from that anchor to the cursor
 * whenever `draft` is still empty — the same `.draft-rubber` line every later
 * segment already gets from its last placed corner.
 *
 * This spec drives a real press-drag (no release) on a fresh room's outline
 * tool and asserts a non-zero-length `.draft-rubber` line is visible *before*
 * the first release, in both the desktop and mobile projects.
 */

const MEDIA_DIR = '.github/pr-media/agent/issue-387-draw-first-segment-feedback';

test('drawing the first segment shows a rubber-band line before the first release', async ({
  page,
}, testInfo) => {
  mkdirSync(MEDIA_DIR, { recursive: true });

  await page.goto('/');
  await page.getByRole('button', { name: /create a room/i }).click();
  await expect(page.locator('.plan-chooser')).toBeVisible();

  // "Draw it yourself" arms the exterior-outline tool on a blank canvas —
  // the simplest case, per the issue's scope note.
  await page.getByRole('button', { name: /draw it yourself/i }).click();
  await expect(page.locator('.plan-chooser')).toHaveCount(0);

  const svg = page.getByRole('img'); // the canvas <svg> — every other <svg> in the editor is an icon
  const box = await svg.boundingBox();
  if (!box) throw new Error('plan editor canvas has no bounding box');

  const start = { x: box.x + box.width * 0.35, y: box.y + box.height * 0.35 };
  const end = { x: box.x + box.width * 0.6, y: box.y + box.height * 0.55 };

  // Before the gesture starts there is nothing to preview yet.
  await expect(page.locator('.draft-rubber')).toHaveCount(0);

  // Press and drag WITHOUT releasing — this is the very first segment, so
  // `draft` is still empty and there is no already-placed corner to preview
  // from. Before the fix, only a hover dot tracked the cursor here.
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move((start.x + end.x) / 2, (start.y + end.y) / 2, { steps: 5 });
  await page.mouse.move(end.x, end.y, { steps: 5 });

  const rubber = page.locator('.draft-rubber');
  await expect(rubber).toHaveCount(1);
  const length = await rubber.evaluate((el: SVGLineElement) => {
    const x1 = parseFloat(el.getAttribute('x1') ?? '0');
    const y1 = parseFloat(el.getAttribute('y1') ?? '0');
    const x2 = parseFloat(el.getAttribute('x2') ?? '0');
    const y2 = parseFloat(el.getAttribute('y2') ?? '0');
    return Math.hypot(x2 - x1, y2 - y1);
  });
  expect(length).toBeGreaterThan(0.05);

  // The anchor also gets the same fixed dot every later segment's placed
  // corner gets, mirroring the rubber band's other end.
  await expect(page.locator('.draft-point')).toHaveCount(1);

  // Capture the in-progress drag — before release — for the PR's media.
  await page.screenshot({ path: `${MEDIA_DIR}/${testInfo.project.name}-mid-drag.png` });

  await page.mouse.up();

  // Releasing commits the first corner and clears the rubber band/hover
  // until the pointer moves again — confirming the gesture handed off to
  // the normal committed-draft rendering rather than leaving stray state.
  await expect(page.locator('.draft-rubber')).toHaveCount(0);
  await expect(page.locator('.draft-point')).toHaveCount(1);
});
