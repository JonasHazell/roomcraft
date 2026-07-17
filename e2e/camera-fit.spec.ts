import { test, expect, type Page } from '@playwright/test';

/**
 * #291: the furnish view's initial camera used a fixed offset that didn't scale
 * with room size, so a large room opened with the camera jammed near a wall —
 * mostly flat wall/ceiling with only a sliver of floor. The offset now scales
 * with the room's footprint (see src/lib/cameraFit.ts, unit-tested), so the
 * whole floor is framed on the first frame. This drives a large seeded room and
 * checks the floor is actually visible in the lower part of the first frame.
 */

const bigRoom = {
  schemaVersion: 5,
  name: 'My rooms',
  updatedAt: new Date().toISOString(),
  rooms: [
    {
      id: 'room-1',
      name: 'Big Room',
      updatedAt: new Date().toISOString(),
      room: { height: 2.5 },
      floorColor: '#c9a878',
      wallColor: '#efe8da',
      floorMaterial: 'matte',
      wallMaterial: 'matte',
      // A 12 × 12 m room — comparable to / larger than the old fixed ~7–8.5 m
      // offset, the exact case that used to jam the camera into a wall.
      walls: [
        { id: 'w1', kind: 'exterior', a: { x: -6, z: -6 }, b: { x: 6, z: -6 } },
        { id: 'w2', kind: 'exterior', a: { x: 6, z: -6 }, b: { x: 6, z: 6 } },
        { id: 'w3', kind: 'exterior', a: { x: 6, z: 6 }, b: { x: -6, z: 6 } },
        { id: 'w4', kind: 'exterior', a: { x: -6, z: 6 }, b: { x: -6, z: -6 } },
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
  }, bigRoom);
  await page.goto('/');
});

const CLIP = 12;
async function readPixel(page: Page, x: number, y: number) {
  const buf = await page.screenshot({ clip: { x: x - CLIP / 2, y: y - CLIP / 2, width: CLIP, height: CLIP } });
  const dataUrl = `data:image/png;base64,${buf.toString('base64')}`;
  return page.evaluate((dataUrl) => {
    return new Promise<[number, number, number]>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const ctx = c.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        const d = ctx.getImageData(Math.floor(img.naturalWidth / 2), Math.floor(img.naturalHeight / 2), 1, 1).data;
        resolve([d[0], d[1], d[2]]);
      };
      img.onerror = () => reject(new Error('decode failed'));
      img.src = dataUrl;
    });
  }, dataUrl);
}

test('a large room is framed with its floor visible on the first frame', async ({ page }, testInfo) => {
  test.setTimeout(180_000);

  await page.locator('.room-card-main', { hasText: 'Big Room' }).click();
  await expect(page.getByRole('button', { name: 'Add furniture' })).toBeVisible();
  await expect(page.locator('.scene-loading')).toBeHidden({ timeout: 90_000 });

  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  if (!box) throw new Error('no canvas box');

  // The warm floor (#c9a878) has a much larger red-minus-blue gap (~81) than the
  // near-white walls/ceiling (#efe8da, ~21). Sampling the lower-centre of the
  // frame, a well-framed room shows floor there; the old wall-jammed view did
  // not. Poll until the first real frame has painted.
  // The camera targets the room centre, so the floor projects around the middle
  // of the frame; sample just below centre where the floor sits.
  const px = box.x + box.width / 2;
  const py = box.y + box.height * 0.55;
  await expect(async () => {
    const [r, , b] = await readPixel(page, px, py);
    expect(r - b).toBeGreaterThan(30); // clearly floor, not a flat wall/ceiling/ground
  }).toPass({ timeout: 120_000, intervals: [500, 1000, 2000] });

  await page.screenshot({ path: `/tmp/pr-291-${testInfo.project.name}.png` });
});
