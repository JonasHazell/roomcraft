import { test, expect } from '@playwright/test';

/**
 * #287: two furnish-view hints said "Click …" on a mobile-first, touch-primary
 * surface. They now use the device-neutral verb "Select …", which reads
 * correctly whether the user taps or clicks. This drives the validation panel's
 * intro hint (the reachable one) in both viewports.
 */
test('the validation panel hint uses device-neutral "Select" wording', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: /create a room/i }).click();
  await page.getByRole('button', { name: /small room/i }).click();
  await page.getByRole('button', { name: /furnish this room/i }).click();

  await page.getByRole('button', { name: /open validation/i }).click();
  const panel = page.getByRole('complementary', { name: 'Validation' });
  await expect(panel).toBeVisible();

  await expect(panel.getByText(/Select an issue to highlight it in the 3D view/i)).toBeVisible();
  await expect(panel.getByText(/Click an issue/i)).toHaveCount(0);
});
