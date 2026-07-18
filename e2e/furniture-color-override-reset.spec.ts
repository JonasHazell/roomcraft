import { test, expect } from '@playwright/test';

/**
 * Regression coverage for #246: once a secondary furniture part (a sofa's
 * cushions vs its frame) gets its own colour override, there must be a way to
 * undo it and let the part resume following the primary colour — not a
 * permanent detachment for the life of the piece. See
 * `FurnitureFields.tsx`'s `FurnitureAppearanceFields` (the reset control) and
 * `furnitureSlice.ts`'s `updateFurniture` (the `colors` merge that now deletes
 * a key given an `undefined` patch value).
 *
 * Runs in both the `desktop` and `mobile` projects (see playwright.config.ts).
 */

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

/**
 * Sets a `<input type="color">`'s value the way a real pick from the native
 * colour picker would: through React's own tracked value setter, not a plain
 * DOM `.value =` assignment. `Locator.fill()` takes the latter path for
 * non-text input types (it sets `.value` directly and dispatches a plain
 * `Event`), which a React-controlled input's internal value tracker sees as
 * "no change" and so never invokes the component's `onChange` — the classic
 * gotcha with driving a controlled input from outside React. Going through the
 * `<input>` prototype's native setter first, then dispatching the event, is
 * the standard workaround (the same one React Testing Library's `fireEvent`
 * relies on).
 */
async function setColor(locator: import('@playwright/test').Locator, hex: string) {
  await locator.evaluate((el: HTMLInputElement, value: string) => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, hex);
}

test('a cleared per-part colour override resumes following the primary colour', async ({
  page,
}) => {
  // The flow mounts the 3D scene and opens the furniture dialog on top of it —
  // same headroom as furniture-distance.spec.ts's equivalent flow.
  test.setTimeout(60_000);

  // Build a room from a template — fast, no manual wall-drawing needed.
  await page.getByRole('button', { name: /create a room/i }).click();
  await page.getByRole('button', { name: /^bedroom/i }).click();
  await page.getByRole('button', { name: /furnish this room/i }).click();

  // Sofa splits into two parts (frame, cushions) — picking it lands directly
  // in the live edit form the colour controls live in.
  await page.getByRole('button', { name: 'Add furniture' }).click();
  await page.getByRole('button', { name: 'Sofa', exact: true }).click();

  const dialog = page.getByRole('dialog', { name: 'Furniture settings' });
  await expect(dialog).toBeVisible();

  // Scoped to the colour chip specifically — each part now groups its colour
  // chip (named after the part) with a "Material" picker just below it, and this
  // test only drives the colours.
  const frame = dialog.locator('input.color-field-chip[aria-label="Frame"]');
  const cushions = dialog.locator('input.color-field-chip[aria-label="Cushions"]');
  const resetButton = dialog.getByRole('button', { name: /match frame colour/i });

  // Fresh piece: cushions already follow the frame's default colour, and there
  // is nothing to reset yet.
  const defaultColor = await frame.inputValue();
  await expect(cushions).toHaveValue(defaultColor);
  await expect(resetButton).toBeHidden();

  // Give the cushions their own override, away from the frame.
  await setColor(cushions, '#123456');
  await expect(cushions).toHaveValue('#123456');
  await expect(resetButton).toBeVisible();

  // Changing the frame colour no longer moves the (now-overridden) cushions.
  await setColor(frame, '#654321');
  await expect(frame).toHaveValue('#654321');
  await expect(cushions).toHaveValue('#123456');

  // Clear the override: the cushions immediately resume the frame's current
  // colour, and the reset control disappears — the detachment is undone.
  await resetButton.click();
  await expect(cushions).toHaveValue('#654321');
  await expect(resetButton).toBeHidden();

  // The cascade is truly back on, not a one-off copy: a further frame change
  // keeps carrying the cushions along with it.
  await setColor(frame, '#00ff00');
  await expect(cushions).toHaveValue('#00ff00');
});
