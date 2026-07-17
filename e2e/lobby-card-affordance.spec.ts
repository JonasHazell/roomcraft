import { test, expect } from '@playwright/test';

/**
 * Regression coverage for issue #251: the lobby's `.room-card-main` is the
 * card's primary "open this room" action, but its only hint that it's
 * tappable used to be a hover-only `title` tooltip — invisible on touch. A
 * trailing chevron (`.room-card-chevron`, the shared `Icon` component) now
 * sits in `.room-card-meta`'s row as an always-visible affordance, distinct
 * from the explicit `.btn`-styled actions (`Edit plan` / `Rename` /
 * `Duplicate` / delete) below it.
 *
 * This is visual-affordance only: the click behaviour, `title`/aria text, and
 * the secondary action buttons are unchanged — the tests below check both the
 * new chevron's presence AND that opening the room still works exactly as
 * before, for both a drawn (furnish) and undrawn (plan) room.
 *
 * A fresh browser context has empty localStorage, so we seed one drawn room
 * and one undrawn room directly (schema v5, see src/lib/persistence.ts).
 */

const project = {
  schemaVersion: 5,
  name: 'My rooms',
  updatedAt: new Date().toISOString(),
  rooms: [
    {
      id: 'room-1',
      name: 'Furnished Room',
      updatedAt: new Date().toISOString(),
      room: { height: 2.5 },
      floorColor: '#c9a878',
      wallColor: '#efe8da',
      floorMaterial: 'matte',
      wallMaterial: 'matte',
      walls: [
        { id: 'w1', kind: 'exterior', a: { x: -2, z: -2.5 }, b: { x: 2, z: -2.5 } },
        { id: 'w2', kind: 'exterior', a: { x: 2, z: -2.5 }, b: { x: 2, z: 2.5 } },
        { id: 'w3', kind: 'exterior', a: { x: 2, z: 2.5 }, b: { x: -2, z: 2.5 } },
        { id: 'w4', kind: 'exterior', a: { x: -2, z: 2.5 }, b: { x: -2, z: -2.5 } },
      ],
      openings: [],
      furniture: [],
      proposals: [
        {
          id: 'p1',
          name: 'Proposal 1',
          furniture: [],
          floorColor: '#c9a878',
          wallColor: '#efe8da',
          floorMaterial: 'matte',
          wallMaterial: 'matte',
        },
      ],
      activeProposalId: 'p1',
    },
    {
      id: 'room-2',
      name: 'Undrawn Room',
      updatedAt: new Date().toISOString(),
      room: { height: 2.5 },
      floorColor: '#c9a878',
      wallColor: '#efe8da',
      floorMaterial: 'matte',
      wallMaterial: 'matte',
      walls: [],
      openings: [],
      furniture: [],
      proposals: [
        {
          id: 'p2',
          name: 'Proposal 1',
          furniture: [],
          floorColor: '#c9a878',
          wallColor: '#efe8da',
          floorMaterial: 'matte',
          wallMaterial: 'matte',
        },
      ],
      activeProposalId: 'p2',
    },
  ],
  activeRoomId: 'room-1',
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript((p) => {
    localStorage.setItem('roomcraft:current', JSON.stringify({ state: { project: p }, version: 5 }));
  }, project);
  await page.goto('/');
});

test('every room card shows an always-visible chevron affordance on its primary action', async ({
  page,
}) => {
  const furnishedMain = page.locator('.room-card', { hasText: 'Furnished Room' }).locator('.room-card-main');
  const undrawnMain = page.locator('.room-card', { hasText: 'Undrawn Room' }).locator('.room-card-main');

  // The chevron is present and visible without any hover/focus interaction —
  // unlike the hover-only `title` tooltip it supplements.
  await expect(furnishedMain.locator('.room-card-chevron .icon')).toBeVisible();
  await expect(undrawnMain.locator('.room-card-chevron .icon')).toBeVisible();

  // The card's own title/meta text are unchanged.
  await expect(furnishedMain).toHaveAttribute('title', 'Furnish “Furnished Room”');
  await expect(furnishedMain.locator('.room-card-meta')).toContainText('1 furnishing proposal');
  await expect(undrawnMain).toHaveAttribute('title', 'Draw the floor plan for “Undrawn Room”');
  await expect(undrawnMain.locator('.room-card-meta')).toContainText('No floor plan yet');
});

test('the drawn room card still opens straight into the furnish view on click', async ({ page }) => {
  await page.locator('.room-card', { hasText: 'Furnished Room' }).locator('.room-card-main').click();

  await expect(page.getByRole('button', { name: 'Add furniture' })).toBeVisible();
  await expect(page.locator('.room-topbar-name')).toHaveText('Furnished Room');
});

test('the undrawn room card still opens into the plan editor on click', async ({ page }) => {
  await page.locator('.room-card', { hasText: 'Undrawn Room' }).locator('.room-card-main').click();

  await expect(page.getByRole('button', { name: 'Done · back to your rooms' })).toBeVisible();
});

test('an undrawn room card omits the redundant Edit plan action', async ({ page }) => {
  // The card's own main tap target already opens the plan editor for an undrawn
  // room, so the extra "Edit plan" action button is dropped there (#275) — but
  // Rename/Duplicate/Delete stay.
  const card = page.locator('.room-card', { hasText: 'Undrawn Room' });
  await expect(card.getByRole('button', { name: 'Edit plan' })).toHaveCount(0);
  await expect(card.getByRole('button', { name: 'Rename' })).toBeVisible();
  await expect(card.getByRole('button', { name: 'Duplicate' })).toBeVisible();
  await expect(card.getByRole('button', { name: 'Delete Undrawn Room' })).toBeVisible();
  await page.screenshot({ path: `/tmp/pr-275-${test.info().project.name}.png` });
});

test('the secondary action buttons are unchanged and still work independently', async ({ page }) => {
  const card = page.locator('.room-card', { hasText: 'Furnished Room' });
  await expect(card.getByRole('button', { name: 'Edit plan' })).toBeVisible();
  await expect(card.getByRole('button', { name: 'Rename' })).toBeVisible();
  await expect(card.getByRole('button', { name: 'Duplicate' })).toBeVisible();
  await expect(card.getByRole('button', { name: 'Delete Furnished Room' })).toBeVisible();

  await card.getByRole('button', { name: 'Edit plan' }).click();
  await expect(page.getByRole('button', { name: 'Done · back to your rooms' })).toBeVisible();
});
