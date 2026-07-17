import { test, expect } from '@playwright/test';

/**
 * #276: the ColorField "clear this colour override" control reused the same
 * `undo-2` glyph as the app's global Undo action, inviting it to be misread as
 * "undo my last edit". It now uses `rotate-ccw` — legible as "revert to the
 * linked default" and visually distinct from Undo. Behaviour, title and
 * resetLabel are unchanged.
 *
 * The living style guide (#styleguide) renders the real ColorField with a reset
 * control, so we assert the swapped glyph there, in both viewports.
 */

// Distinctive path segments of each Lucide glyph.
const UNDO_2_PATH = 'M9 14 4 9l5-5';
const ROTATE_CCW_PATH = 'M3 3v5h5';

async function setColor(locator: import('@playwright/test').Locator, hex: string) {
  await locator.evaluate((el: HTMLInputElement, value: string) => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, hex);
}

test('the colour-override reset control no longer uses the Undo glyph', async ({ page }) => {
  await page.goto('/#styleguide');

  // Give the "Bedding" part its own override so the reset control appears.
  const bedding = page.getByLabel('Bedding');
  await expect(bedding).toBeVisible();
  await setColor(bedding, '#123456');

  const reset = page.getByRole('button', { name: 'Match frame colour' });
  await expect(reset).toBeVisible();

  // The reset control shows the revert glyph, not the Undo glyph.
  await expect(reset.locator(`path[d="${ROTATE_CCW_PATH}"]`)).toHaveCount(1);
  await expect(reset.locator(`path[d="${UNDO_2_PATH}"]`)).toHaveCount(0);

  await reset.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `/tmp/pr-276-${test.info().project.name}.png` });
});
