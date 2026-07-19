import { test, expect } from '@playwright/test';

/**
 * Coverage for issue #382: the lobby's "My homes" switcher lets a user keep
 * more than one home project on the same device — a parent's place and their
 * own, say — instead of a second one silently replacing the first (the old
 * behaviour, since `roomcraft:current` held exactly one `project` ever).
 *
 * This drives the whole local-only flow end to end: create a second home,
 * give each home its own distinguishable room count, switch between them
 * without either leaking into the other, and reload to confirm both homes —
 * and whichever was active — survive in `localStorage`.
 *
 * A fresh browser context has empty localStorage, so the app boots into a
 * single default home ("My home") with no rooms yet, same as before #382.
 */

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('creating a second home keeps homes independent and both persist across reload', async ({
  page,
}, testInfo) => {
  await expect(page.getByRole('heading', { name: 'My homes' })).toBeVisible();

  // The one starting home, with no rooms of its own yet.
  const myHome = page.locator('.home-card', { hasText: 'My home' });
  await expect(myHome).toBeVisible();
  await expect(myHome).toHaveClass(/home-card-active/);
  await expect(page.getByRole('heading', { name: /create your first room/i })).toBeVisible();

  // Give "My home" a room, so the two homes are distinguishable by room count.
  await page.getByRole('button', { name: /create a room/i }).click();
  await expect(page.locator('.plan-chooser')).toBeVisible();
  await page.getByRole('button', { name: /small room/i }).click();
  await expect(page.locator('.plan-room-panel')).toBeVisible();
  await page.getByRole('button', { name: /back to your rooms/i }).click();
  await expect(page.locator('.room-card:not(.room-card-new)')).toHaveCount(1);
  await expect(myHome).toContainText('1 room');

  // "New home" adds a second, empty home and switches to it straight away —
  // the room just added to "My home" must not follow it over.
  await page.getByRole('button', { name: 'New home' }).click();
  await expect(page.getByRole('heading', { name: /create your first room/i })).toBeVisible();
  await expect(page.locator('.room-card')).toHaveCount(0);

  const home2 = page.locator('.home-card', { hasText: 'Home 2' });
  await expect(home2).toBeVisible();
  await expect(home2).toHaveClass(/home-card-active/);
  await expect(myHome).not.toHaveClass(/home-card-active/);

  await page.screenshot({
    path: testInfo.outputPath(`multiple-homes-${testInfo.project.name}.png`),
    fullPage: true,
  });

  // Switching back to "My home" shows its room again — nothing leaked either way.
  await myHome.locator('.home-card-main').click();
  await expect(myHome).toHaveClass(/home-card-active/);
  await expect(page.locator('.room-card:not(.room-card-new)')).toHaveCount(1);

  // Switch to Home 2 and reload: both homes, their room counts and which one
  // was active all survive in localStorage.
  await home2.locator('.home-card-main').click();
  await expect(page.locator('.room-card')).toHaveCount(0);

  await page.reload();

  await expect(page.locator('.home-card', { hasText: 'My home' })).toContainText('1 room');
  await expect(page.locator('.home-card', { hasText: 'Home 2' })).toHaveClass(/home-card-active/);
  await expect(page.locator('.room-card')).toHaveCount(0);

  await page.locator('.home-card', { hasText: 'My home' }).locator('.home-card-main').click();
  await expect(page.locator('.room-card:not(.room-card-new)')).toHaveCount(1);
});

test('a lone home cannot be deleted, but renaming it updates the switcher', async ({ page }) => {
  const myHome = page.locator('.home-card', { hasText: 'My home' });
  await expect(myHome.getByRole('button', { name: /delete home/i })).toBeDisabled();

  // Renaming goes through the app's own prompt dialog (DialogHost), not a
  // native window.prompt.
  await myHome.getByRole('button', { name: /rename home/i }).click();
  await page.getByLabel('Home name').fill('Cabin');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.locator('.home-card', { hasText: 'Cabin' })).toBeVisible();
  await expect(page.locator('.home-card', { hasText: 'My home' })).toHaveCount(0);

  // A second home can be deleted; the delete goes through the confirm dialog.
  await page.getByRole('button', { name: 'New home' }).click();
  const cabin = page.locator('.home-card', { hasText: 'Cabin' });
  await expect(cabin.getByRole('button', { name: /delete home/i })).toBeEnabled();
  await cabin.getByRole('button', { name: /delete home/i }).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(cabin).toHaveCount(0);
  await expect(page.locator('.home-card', { hasText: 'Home 2' })).toHaveClass(/home-card-active/);
});
