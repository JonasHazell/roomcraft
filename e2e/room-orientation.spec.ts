import { test, expect, type Page } from '@playwright/test';
import { join } from 'node:path';

/**
 * #418: `Room` gained an optional `orientation` field (which way the room
 * faces) plus an 8-way compass picker in `PlanRoomPanel.tsx`, next to Ceiling
 * height. This drives the real picker: setting a direction, clearing it back
 * to unset by tapping the same direction again, and undo/redo covering the
 * edit exactly like any other room change (`setRoom`).
 */

const project = {
  schemaVersion: 5,
  name: 'My rooms',
  updatedAt: new Date().toISOString(),
  rooms: [
    {
      id: 'room-1',
      name: 'Orientation room',
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
  ],
  activeRoomId: 'room-1',
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript((p) => {
    localStorage.setItem('roomcraft:current', JSON.stringify({ state: { project: p }, version: 5 }));
  }, project);
  await page.goto('/');
});

/** The persisted `room.orientation` for `room-1`, read straight from localStorage. */
async function roomOrientation(page: Page): Promise<string | undefined> {
  return page.evaluate(() => {
    const raw = localStorage.getItem('roomcraft:current');
    if (!raw) return undefined;
    let found: string | undefined;
    const walk = (v: unknown): void => {
      if (found !== undefined || !v || typeof v !== 'object') return;
      if (Array.isArray(v)) {
        v.forEach(walk);
        return;
      }
      const o = v as Record<string, unknown>;
      if (o.id === 'room-1' && o.room && typeof o.room === 'object') {
        found = (o.room as Record<string, unknown>).orientation as string | undefined;
        return;
      }
      Object.values(o).forEach(walk);
    };
    walk(JSON.parse(raw));
    return found;
  });
}

test('the compass picker sets, clears and persists the room orientation, and undo/redo cover it', async ({
  page,
}, testInfo) => {
  test.setTimeout(60_000);

  await page
    .locator('.room-card', { hasText: 'Orientation room' })
    .getByRole('button', { name: 'Edit plan' })
    .click();
  await expect(page.getByRole('button', { name: 'Done · back to your rooms' })).toBeVisible();

  const north = page.getByRole('button', { name: 'North', exact: true });
  await expect(north).toBeVisible();
  await expect(north).toHaveAttribute('aria-pressed', 'false');
  expect(await roomOrientation(page)).toBeUndefined();

  await page.screenshot({
    path: join('test-results', `room-orientation-unset-${testInfo.project.name}.png`),
  });

  // Setting a direction updates the control's own state and persists.
  await north.click();
  await expect(north).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => roomOrientation(page)).toBe('N');

  await page.screenshot({
    path: join('test-results', `room-orientation-set-${testInfo.project.name}.png`),
  });

  // Undo restores the unset state, exactly like any other room edit.
  await page.keyboard.press('Control+z');
  await expect(north).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(() => roomOrientation(page)).toBeUndefined();

  // Redo brings the direction back.
  await page.keyboard.press('Control+y');
  await expect(north).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => roomOrientation(page)).toBe('N');

  // Tapping the active direction again clears it back to unset.
  await north.click();
  await expect(north).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(() => roomOrientation(page)).toBeUndefined();

  // A different direction replaces the (already-unset) value outright.
  const southeast = page.getByRole('button', { name: 'Southeast', exact: true });
  await southeast.click();
  await expect(southeast).toHaveAttribute('aria-pressed', 'true');
  await expect(north).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(() => roomOrientation(page)).toBe('SE');
});
