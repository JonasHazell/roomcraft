import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';

/**
 * Regression coverage for #222: `NumberField` (src/components/panel/fields.tsx)
 * used to put both the visible label ("Length") and the unit suffix ("cm")
 * inside the same `<label>` with nothing separating them for assistive tech,
 * so the computed accessible name was "Lengthcm" instead of "Length" — and
 * `page.getByLabel('Length')` couldn't resolve the field at all, breaking the
 * app's own getByLabel-first testing convention (see CLAUDE.md).
 *
 * The fix marks the suffix `aria-hidden="true"` and gives the `<input>` an
 * explicit `aria-label` matching the visible label, so the layout is
 * unchanged but the accessible name is exactly "Length". This test drives
 * the real wall-length field in the 2D plan editor and asserts
 * `getByLabel('Length', { exact: true })` resolves it — proving the fix from
 * the test's own perspective, not just visually — and that the "cm" suffix
 * is still visibly rendered next to it.
 */

const MEDIA_DIR = '.github/pr-media/agent/issue-222-numberfield-aria-label';

test('the wall Length field resolves via getByLabel and still shows its "cm" suffix', async ({
  page,
}, testInfo) => {
  await page.goto('/');

  // Build a room from the "Small room" template — lands straight in the plan
  // editor with the "select" tool active (same starting point as
  // e2e/plan-corner-drag.spec.ts).
  await page.getByRole('button', { name: /create a room/i }).click();
  await page.getByLabel(/room name/i).fill('Accessible Name Test');
  await page.getByRole('button', { name: /small room/i }).click();

  // Select the first wall so its property sheet (.plan-wall-panel) opens. The
  // hit-target line is deliberately invisible (`stroke: transparent`, a wide
  // click/tap area — see .wall-hit in src/index.css), so Playwright's
  // visibility-gated `.click()` won't engage it; click its bounding-box center
  // directly instead, the same approach e2e/plan-corner-drag.spec.ts uses for
  // the corner handles.
  const wallHit = page.locator('.wall-hit').first();
  const box = await wallHit.boundingBox();
  if (!box) throw new Error('wall hit-target has no bounding box');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

  const lengthField = page.getByLabel('Length', { exact: true });
  await expect(lengthField).toBeVisible();

  // Exactly one match — proves the accessible name is precisely "Length", not
  // e.g. "Lengthcm" (which wouldn't exact-match) or ambiguous across fields.
  await expect(lengthField).toHaveCount(1);
  await expect(lengthField).toHaveAttribute('aria-label', 'Length');

  // The suffix must still be visible on screen — only its accessible-name
  // exposure changed (aria-hidden), not the visual layout.
  const suffix = page.locator('.plan-wall-panel .field-suffix').first();
  await expect(suffix).toBeVisible();
  await expect(suffix).toHaveText('cm');
  await expect(suffix).toHaveAttribute('aria-hidden', 'true');

  // The field is still fully functional through its accessible-name lookup.
  await lengthField.fill('250');
  await lengthField.blur();
  await expect(lengthField).toHaveValue('250');

  mkdirSync(MEDIA_DIR, { recursive: true });
  await page.screenshot({
    path: `${MEDIA_DIR}/${testInfo.project.name}-wall-length-field.png`,
  });
});
