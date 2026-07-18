import { test, expect } from '@playwright/test';

/**
 * #332: tapping Auto-arrange used to give the user no signal at all — the store
 * already computes a before/after design score (or a null "nothing to do"), and
 * the UI threw it away. It now shows a brief, calm result line inside the (still
 * open) proposal menu, right under the actions where the tap happened:
 *   - improved  → "Score <before> → <after>"
 *   - no gain   → "Already looks good"
 *   - empty room → "Add some furniture first"
 * The line is transient: it clears whenever the menu closes.
 *
 * Runs in the `desktop` and `mobile` projects (see playwright.config.ts), so the
 * feedback is validated in both viewports, and each captures a screenshot of the
 * status line keyed off the project name.
 */

const now = new Date().toISOString();

/** A 4×5 room seeded with a bed and nightstand dumped mid-floor — a poor layout
 *  auto-arrange can measurably improve (matches the store unit-test scenario). */
const suboptimalRoom = {
  id: 'room-msg',
  name: 'Messy Bedroom',
  updatedAt: now,
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
  furniture: [
    {
      id: 'bed-1',
      kind: 'bed',
      name: 'Bed',
      position: { x: 0, z: 0 },
      rotationY: 0,
      size: { width: 1.6, depth: 2.0, height: 0.5 },
      elevation: 0,
      color: '#b7a17e',
    },
    {
      id: 'ns-1',
      kind: 'nightstand',
      name: 'Nightstand',
      position: { x: -1.5, z: 1.8 },
      rotationY: 0,
      size: { width: 0.45, depth: 0.4, height: 0.55 },
      elevation: 0,
      color: '#a08b6f',
    },
  ],
  proposals: [
    {
      id: 'p1',
      name: 'Proposal 1',
      furniture: [
        {
          id: 'bed-1',
          kind: 'bed',
          name: 'Bed',
          position: { x: 0, z: 0 },
          rotationY: 0,
          size: { width: 1.6, depth: 2.0, height: 0.5 },
          elevation: 0,
          color: '#b7a17e',
        },
        {
          id: 'ns-1',
          kind: 'nightstand',
          name: 'Nightstand',
          position: { x: -1.5, z: 1.8 },
          rotationY: 0,
          size: { width: 0.45, depth: 0.4, height: 0.55 },
          elevation: 0,
          color: '#a08b6f',
        },
      ],
      floorColor: '#c9a878',
      wallColor: '#efe8da',
      floorMaterial: 'matte',
      wallMaterial: 'matte',
    },
  ],
  activeProposalId: 'p1',
};

/** The same room shape but with no furniture at all — auto-arrange has nothing
 *  to do and must say so. */
const emptyRoom = {
  ...suboptimalRoom,
  id: 'room-empty',
  name: 'Empty Room',
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
};

function seed(room: typeof suboptimalRoom) {
  return {
    schemaVersion: 5,
    name: 'My rooms',
    updatedAt: now,
    rooms: [room],
    activeRoomId: room.id,
  };
}

async function openFurnishMenu(page: import('@playwright/test').Page, roomName: string) {
  await page
    .locator('.room-card', { hasText: roomName })
    .getByRole('button', { name: 'Edit plan' })
    .click();
  await page.getByRole('button', { name: 'Furnish this room' }).click();
  await expect(page.getByRole('button', { name: 'Add furniture' })).toBeVisible();
  await page.locator('.proposal-pill').click();
  await expect(page.getByRole('menu', { name: 'Furnishing proposals' })).toBeVisible();
}

test('auto-arrange reports the improved score in the proposal menu', async ({ page }, testInfo) => {
  await page.addInitScript((p) => {
    localStorage.setItem('roomcraft:current', JSON.stringify({ state: { project: p }, version: 5 }));
  }, seed(suboptimalRoom));
  await page.goto('/');

  await openFurnishMenu(page, 'Messy Bedroom');

  // Tap Auto-arrange; the menu stays open and shows the before → after score.
  await page.getByRole('button', { name: 'Auto-arrange' }).click();

  const status = page.getByRole('status');
  await expect(status).toHaveText(/Score\s+\d+\s+→\s+\d+/);
  // The menu is still open (the status lives inside it), so the result is
  // visible right where the tap happened.
  await expect(page.getByRole('menu', { name: 'Furnishing proposals' })).toBeVisible();

  await page.screenshot({
    path: `e2e-artifacts/issue-332-autoarrange-${testInfo.project.name}.png`,
  });

  // Transient: closing the menu drops the line, and reopening starts clean.
  await page.getByRole('button', { name: 'Close' }).click();
  await page.locator('.proposal-pill').click();
  await expect(page.getByRole('status')).toHaveCount(0);
});

test('auto-arrange on an empty room asks for furniture first', async ({ page }) => {
  await page.addInitScript((p) => {
    localStorage.setItem('roomcraft:current', JSON.stringify({ state: { project: p }, version: 5 }));
  }, seed(emptyRoom));
  await page.goto('/');

  await openFurnishMenu(page, 'Empty Room');

  await page.getByRole('button', { name: 'Auto-arrange' }).click();

  await expect(page.getByRole('status')).toHaveText('Add some furniture first');
});
