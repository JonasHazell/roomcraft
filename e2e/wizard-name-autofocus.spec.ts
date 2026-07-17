import { test, expect } from '@playwright/test';

/**
 * #290: the wizard's first step pre-fills a room name and selects it on focus,
 * but nothing focused the field automatically — an avoidable extra tap on the
 * app's most important onboarding screen. The field now auto-focuses on mount
 * on fine-pointer devices; on coarse pointers it's skipped so the soft keyboard
 * doesn't pop over the first screen on load.
 */
test('the name field auto-focuses on desktop, not on coarse-pointer mobile', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  await page.getByRole('button', { name: /create a room/i }).click();
  await expect(page.getByRole('heading', { name: /name your room/i })).toBeVisible();

  const nameField = page.getByLabel('Room name');
  await expect(nameField).toBeVisible();

  if (testInfo.project.name === 'mobile') {
    // Coarse pointer: not auto-focused (avoids an unwelcome keyboard pop-in).
    await expect(nameField).not.toBeFocused();
  } else {
    // Fine pointer: focused and ready to type immediately.
    await expect(nameField).toBeFocused();
  }
});
