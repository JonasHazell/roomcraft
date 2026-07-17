import { test, expect } from '@playwright/test';

/**
 * Regression coverage for issue #229: duplicating a room from the lobby now
 * names the copy after its source ("<name> copy", falling back to a numbered
 * suffix if that name is taken) instead of a generic "Room N" with no lineage,
 * and the new card is scrolled into view and briefly highlighted so the
 * action doesn't look like it silently did nothing.
 *
 * A fresh browser context has empty localStorage, so we seed a project with
 * several already-drawn rooms (schema v5, see src/lib/persistence.ts) — enough
 * that the duplicate lands off-screen without the scroll-into-view fix.
 */

function room(id: string, name: string) {
  return {
    id,
    name,
    updatedAt: new Date().toISOString(),
    room: { height: 2.5 },
    floorColor: '#c9a878',
    wallColor: '#efe8da',
    floorMaterial: 'matte',
    wallMaterial: 'matte',
    walls: [
      { id: `${id}-w1`, kind: 'exterior', a: { x: -2, z: -2.5 }, b: { x: 2, z: -2.5 } },
      { id: `${id}-w2`, kind: 'exterior', a: { x: 2, z: -2.5 }, b: { x: 2, z: 2.5 } },
      { id: `${id}-w3`, kind: 'exterior', a: { x: 2, z: 2.5 }, b: { x: -2, z: 2.5 } },
      { id: `${id}-w4`, kind: 'exterior', a: { x: -2, z: 2.5 }, b: { x: -2, z: -2.5 } },
    ],
    openings: [],
    furniture: [],
    proposals: [
      {
        id: `${id}-p1`,
        name: 'Proposal 1',
        furniture: [],
        floorColor: '#c9a878',
        wallColor: '#efe8da',
        floorMaterial: 'matte',
        wallMaterial: 'matte',
      },
    ],
    activeProposalId: `${id}-p1`,
  };
}

// Enough rooms that "Kitchen" (first) and its duplicate (appended last) are
// not both on screen at once — the scenario the issue describes ("the new
// card is invisible until the user scrolls to find it"). At the grid's
// minimum 240px card width, this comfortably overflows a single screen in
// both the desktop and mobile viewports.
const rooms = [room('room-1', 'Kitchen'), ...Array.from({ length: 17 }, (_, i) => room(`room-${i + 2}`, `Room ${i + 2}`))];

const project = {
  schemaVersion: 5,
  name: 'My rooms',
  updatedAt: new Date().toISOString(),
  rooms,
  activeRoomId: 'room-1',
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript((p) => {
    localStorage.setItem('roomcraft:current', JSON.stringify({ state: { project: p }, version: 5 }));
  }, project);
  await page.goto('/');
});

test('duplicating a room names the copy after its source and scrolls/highlights it into view', async ({
  page,
}, testInfo) => {
  await expect(page.getByRole('heading', { name: 'Roomcraft' })).toBeVisible();

  await page
    .locator('.room-card', { hasText: 'Kitchen' })
    .getByRole('button', { name: 'Duplicate', exact: true })
    .click();

  // Named after its source, not a generic "Room N".
  const copyCard = page.locator('.room-card', { hasText: 'Kitchen copy' });
  await expect(copyCard).toBeVisible();
  await expect(copyCard).toContainText('Kitchen copy');

  // The original is untouched and still present.
  await expect(page.locator('.room-card', { hasText: 'Kitchen' }).first()).toBeVisible();

  // Scrolled into view: the new card sits inside the viewport, not below it.
  await expect(copyCard).toBeInViewport();

  // Briefly highlighted so the action reads as having done something.
  await expect(copyCard).toHaveClass(/room-card-duplicated/);

  await page.screenshot({
    path: testInfo.outputPath(`duplicate-room-${testInfo.project.name}.png`),
    fullPage: true,
  });

  // The highlight clears itself once the animation ends.
  await expect(copyCard).not.toHaveClass(/room-card-duplicated/, { timeout: 5000 });

  // Duplicating again avoids the name collision with a numbered suffix.
  await page
    .locator('.room-card', { hasText: 'Kitchen' })
    .first()
    .getByRole('button', { name: 'Duplicate', exact: true })
    .click();
  await expect(page.locator('.room-card', { hasText: 'Kitchen copy 2' })).toBeVisible();
});
