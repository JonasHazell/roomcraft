import { test, expect, type Page } from '@playwright/test';

/**
 * #269: picking a wall/floor colour via the dock's native colour input fires
 * many change events during one continuous drag, and each used to become its
 * own undo step (and undo also clears the selection, hiding the swatch). The
 * pick is now wrapped in a single history batch (focus→…→blur), so one drag
 * collapses to one undo step. This drives a simulated multi-event drag on the
 * floor colour and asserts a single Undo restores the original colour.
 */

const project = {
  schemaVersion: 5,
  name: 'My rooms',
  updatedAt: new Date().toISOString(),
  rooms: [
    {
      id: 'room-1',
      name: 'Colour Room',
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

/** Clicks the floor in the 3D scene, retrying until the Floor actions bar shows
 *  (the WebGL scene may not be raycast-pickable on the first click under load). */
async function selectFloor(page: Page) {
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  if (!box) throw new Error('no canvas box');
  const bar = page.getByRole('toolbar', { name: 'Floor actions' });
  await expect(async () => {
    // Below dead-centre: the camera looks down, so the floor sits low in the view.
    await canvas.click({ position: { x: box.width / 2, y: box.height * 0.65 } });
    await expect(bar).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 90_000, intervals: [500, 1000, 2000] });
  return bar;
}

test('a continuous colour pick is a single undo step', async ({ page }) => {
  test.setTimeout(180_000);

  await page.locator('.room-card-main', { hasText: 'Colour Room' }).click();
  await expect(page.getByRole('button', { name: 'Add furniture' })).toBeVisible();
  await expect(page.locator('.scene-loading')).toBeHidden({ timeout: 90_000 });

  const bar = await selectFloor(page);
  const swatch = bar.locator('.sel-color-input');
  const original = await swatch.inputValue();
  expect(original.toLowerCase()).toBe('#c9a878');

  // Simulate one continuous native colour-picker drag: focus, several input
  // events, then blur — the exact multi-event shape the batch must collapse.
  await swatch.evaluate((el: HTMLInputElement) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    el.focus();
    for (const c of ['#111111', '#222222', '#333333', '#444444', '#555555']) {
      setter.call(el, c);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
    el.blur();
  });
  await expect(swatch).toHaveValue('#555555');

  // One Undo must return all the way to the original colour (one batched step),
  // not just peel back the last of the five events.
  await page.keyboard.press('Control+z');

  // Undo clears the selection, so re-select the floor to read the swatch again.
  const barAgain = await selectFloor(page);
  await expect(barAgain.locator('.sel-color-input')).toHaveValue(original);
});
