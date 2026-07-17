import { test, expect } from '@playwright/test';

/**
 * #268: the furniture Width/Depth/Height/"Height above floor" fields applied
 * every keystroke live, re-running the collision/repositioning pass per digit
 * and visibly nudging the piece mid-type. They now use `commitOnBlur` (like the
 * wall-length field): the value applies only on blur/Enter.
 *
 * Two observable signatures of `commitOnBlur` on a NumberField:
 *  - onFocus selects the whole value (gated on the prop), so a single typed
 *    digit REPLACES the multi-digit value rather than inserting into it.
 *  - Enter commits and the value sticks (clamped).
 * A live-apply field does neither (no select-on-focus).
 */
test('furniture size fields commit on blur/Enter, not per keystroke', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/');

  await page.getByRole('button', { name: /create a room/i }).click();
  await expect(page.getByRole('heading', { name: /name your room/i })).toBeVisible();
  await page.getByRole('button', { name: /^next/i }).click();
  await page.getByRole('button', { name: /^bedroom/i }).click();
  await page.getByRole('button', { name: /^next/i }).click();
  await page.getByRole('button', { name: /create room/i }).click();

  await page.getByRole('button', { name: 'Add furniture' }).click();
  await page.getByRole('button', { name: 'Sofa', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Furniture settings' })).toBeVisible();

  const width = page.getByLabel('Width');
  const original = await width.inputValue();
  expect(original.length).toBeGreaterThanOrEqual(2); // a multi-digit default, e.g. "220"

  // Focus selects all (commitOnBlur only), so one digit replaces the whole value.
  await width.click();
  await width.pressSequentially('7');
  await expect(width).toHaveValue('7');

  // Enter commits; the value sticks (7 is above the 5 cm minimum).
  await width.press('Enter');
  await expect(width).toHaveValue('7');

  // A fresh multi-digit edit also commits cleanly on Enter.
  await width.click();
  await width.pressSequentially('123');
  await width.press('Enter');
  await expect(width).toHaveValue('123');
});
