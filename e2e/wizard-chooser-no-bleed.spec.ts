import { test, expect } from '@playwright/test';

/**
 * #273: on the new-room wizard's "Walls" step, before any outline exists, the
 * plan editor was already armed in drawing mode underneath the translucent
 * shape-chooser overlay — so the drawing hint pill and dock controls bled
 * through as ghost text/shapes on the first interactive screen. The toolbar is
 * now suppressed while the chooser is open, and returns once it's dismissed.
 */
test('no plan hint pill or dock bleeds through the wizard shape chooser', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  await page.getByRole('button', { name: /create a room/i }).click();
  await expect(page.getByRole('heading', { name: /name your room/i })).toBeVisible();
  await page.getByRole('button', { name: /^next/i }).click();

  // Walls step of a brand-new room: the shape chooser is up...
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
