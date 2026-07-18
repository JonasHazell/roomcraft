import { test, expect } from '@playwright/test';

/**
 * #285: a brand-new room with zero furniture was told "No rule violations found
 * — nicely furnished!" — the same praise a genuinely well-furnished room gets —
 * because `violated.length === 0` is also true when there is nothing to check at
 * all (`report.total === null`). The compliment is now gated on
 * `report.total !== null`, mirroring the score chip's own null-check.
 */
test('an empty room is not told it is "nicely furnished"', async ({ page }, testInfo) => {
  await page.goto('/');

  // Create an empty, drawn room and land in the 3D furnish view with no furniture.
  await page.getByRole('button', { name: /create a room/i }).click();
  await page.getByRole('button', { name: /small room/i }).click();
  await page.getByRole('button', { name: /furnish this room/i }).click();

  await page.getByRole('button', { name: /open validation/i }).click();
  const panel = page.getByRole('complementary', { name: 'Validation' });
  await expect(panel).toBeVisible();

  // The "nothing to check yet" state is communicated by the room-type line...
  await expect(panel.getByText(/Room type unknown — add furniture/i)).toBeVisible();
  // ...and NOT by a false compliment.
  await expect(panel.getByText(/nicely furnished/i)).toHaveCount(0);
  // The score chip shows the same "nothing scored yet" state it always did.
  await expect(panel.getByText('of 100')).toBeVisible();

  await page.screenshot({ path: `/tmp/pr-285-${testInfo.project.name}.png` });
});
