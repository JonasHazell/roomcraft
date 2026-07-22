import { test, expect } from '@playwright/test';

/**
 * The outdoor patio planner (#patio): a standalone 3D sandbox for trying deck
 * (altan) sizes and ground surfaces (paving / gravel) against a house. Runs in
 * both the desktop and mobile projects (see playwright.config.ts), so the
 * floating options panel is exercised as a desktop card and as a mobile bottom
 * sheet.
 */

test('the lobby links to the patio planner, which renders its 3D view', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /plan a patio in 3d/i }).click();

  await expect(page).toHaveURL(/#patio$/);
  await expect(page.locator('.patio-view canvas')).toBeVisible();
  await expect(page.getByRole('heading', { name: /altan & markyta/i })).toBeVisible();
  await expect(page.getByText('Uteplats')).toBeVisible();
});

test('presets, surfaces and deck materials update the plan', async ({ page }) => {
  await page.goto('/#patio');
  await expect(page.locator('.patio-view canvas')).toBeVisible();

  // A preset drives both size sliders in one tap.
  await page.getByRole('button', { name: 'Stor' }).click();
  await expect(page.getByLabel('Altanens bredd')).toHaveValue('8');
  await expect(page.getByLabel('Altanens djup')).toHaveValue('4');

  // Sliders adjust the deck directly.
  await page.getByLabel('Markyta framför').fill('7');
  await expect(page.getByLabel('Markyta framför')).toHaveValue('7');

  // Choosing a ground surface marks it pressed (single-select).
  const gravel = page.getByRole('button', { name: 'Loose gravel' });
  await gravel.click();
  await expect(gravel).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Concrete paving slabs' })).toHaveAttribute(
    'aria-pressed',
    'false',
  );

  // Choosing a decking material likewise.
  const composite = page.getByRole('button', { name: 'Grey composite decking' });
  await composite.click();
  await expect(composite).toHaveAttribute('aria-pressed', 'true');

  // Reset returns to the defaults.
  await page.getByRole('button', { name: /återställ/i }).click();
  await expect(page.getByLabel('Altanens bredd')).toHaveValue('5');
  await expect(page.getByRole('button', { name: 'Concrete paving slabs' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('the options panel collapses and the view can be left', async ({ page }) => {
  await page.goto('/#patio');
  await expect(page.getByRole('button', { name: 'Liten' })).toBeVisible();

  // Collapsing hides the body (just the header stays) so the scene is unobstructed.
  await page.getByRole('button', { name: /collapse options/i }).click();
  await expect(page.getByRole('button', { name: 'Liten' })).toBeHidden();

  // Leaving clears the hash and returns to the lobby.
  await page.getByRole('button', { name: /tillbaka/i }).click();
  await expect(page).not.toHaveURL(/#patio/);
  await expect(page.getByRole('heading', { name: /create your first room/i })).toBeVisible();
});
