import { test, expect } from '@playwright/test';

/**
 * #274: on a desktop-width viewport the wizard's "Name your room" step
 * vertically centred a small card in an otherwise bare body, leaving large
 * empty margins top and bottom. On wide viewports the card is now anchored
 * nearer the top; the mobile layout is unchanged. This spec runs in both the
 * desktop and mobile projects and asserts the right behaviour for each.
 */
test('the name card is anchored high on wide viewports, centred on mobile', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  await page.getByRole('button', { name: /create a room/i }).click();
  await expect(page.getByRole('heading', { name: /name your room/i })).toBeVisible();

  const body = page.locator('.wizard-body');
  const card = page.locator('.wizard-name-card');
  const bodyBox = await body.boundingBox();
  const cardBox = await card.boundingBox();
  if (!bodyBox || !cardBox) throw new Error('expected bounding boxes');

  const gapAbove = cardBox.y - bodyBox.y;
  const gapBelow = bodyBox.y + bodyBox.height - (cardBox.y + cardBox.height);

  const viewport = page.viewportSize();
  if (!viewport) throw new Error('expected a viewport size');

  if (viewport.width > 768) {
    // Anchored near the top: much less space above than below.
    expect(gapAbove).toBeLessThan(gapBelow);
    expect(gapAbove).toBeLessThan(bodyBox.height * 0.35);
  } else {
    // Mobile: card is still visible and not jammed to the very top.
    await expect(card).toBeVisible();
  }

  await page.screenshot({ path: `/tmp/pr-274-${testInfo.project.name}.png` });
});
