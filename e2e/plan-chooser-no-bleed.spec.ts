import { test, expect } from '@playwright/test';

/**
 * #273: when a new room opens on the plan editor's shape chooser, the drawing
 * tool is armed underneath the translucent overlay — so the drawing hint pill
 * and dock controls used to bleed through as ghost text/shapes on the first
 * interactive screen. The toolbar is suppressed while the chooser is open, and
 * returns once it's dismissed.
 */
test('no plan hint pill or dock bleeds through the shape chooser', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.getByRole('button', { name: /create a room/i }).click();

  // A brand-new room opens straight on the shape chooser...
  await expect(page.locator('.plan-chooser')).toBeVisible();
  // ...and nothing from the plan toolbar renders behind it.
  await expect(page.locator('.plan-hint-pill')).toHaveCount(0);
  await expect(page.locator('.plan-dock')).toHaveCount(0);

  await page.screenshot({ path: `/tmp/pr-273-${testInfo.project.name}.png` });

  // Dismissing the chooser (choosing to draw by hand) brings the toolbar back.
  await page.getByRole('button', { name: /draw it yourself/i }).click();
  await expect(page.locator('.plan-chooser')).toHaveCount(0);
  await expect(page.locator('.plan-dock')).toBeVisible();
});
