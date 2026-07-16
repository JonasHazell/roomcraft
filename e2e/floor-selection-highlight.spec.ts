import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

/**
 * Regression coverage for issue #244: clicking the floor in the 3D view must
 * light it up the same way a selected wall or piece of furniture already does
 * (see `Walls.tsx`'s `emissive={selected ? SELECT_EMISSIVE : '#000000'}` /
 * `emissiveIntensity={selected ? 0.25 : 0}` on its material, now mirrored by
 * `Floor.tsx`). Before this fix, clicking the floor silently opened the
 * floor-colour bar with no on-screen change to the mesh itself.
 *
 * The floor is rendered on a WebGL `<canvas>`, not the DOM, so there is no
 * `getComputedStyle` to read. Per AGENT_LEARNINGS.md's "assert the actual
 * computed value, not just look right in a manual/visual check" guidance,
 * this reads the *actual rendered pixel colour* at a point on the floor,
 * before and after selecting it, rather than only eyeballing a screenshot.
 * `SELECT_EMISSIVE` (`--select`, `#2f6fdd`) is a blue with almost no
 * counterpart in the warm floor colour used here, so a real emissive glow
 * must show up as a blue-channel jump much larger than the red/green jump —
 * that is the concrete, numeric signal this test checks. Reading raw pixels
 * off the live WebGL canvas isn't reliable (the drawing buffer isn't
 * preserved), so this round-trips through `page.screenshot()` — the actual
 * composited frame — decoded back in-page via an `<img>`/2D canvas, which
 * does yield real pixel data.
 */

const project = {
  schemaVersion: 5,
  name: 'My rooms',
  updatedAt: new Date().toISOString(),
  rooms: [
    {
      id: 'room-1',
      name: 'Floor Selection Room',
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

/** Opens the seeded room from the lobby, landing on the furnish view's 3D scene. */
async function openFurnishView(page: Page) {
  await page.locator('.room-card-main', { hasText: 'Floor Selection Room' }).click();
  await expect(page.getByRole('button', { name: 'Add furniture' })).toBeVisible();
}

// A small region around the point of interest — cheap to capture and decode,
// which matters because this spec calls it repeatedly while polling for the
// scene's first painted frame, and heavier full-page screenshots run into the
// per-call test timeout on a loaded machine.
const CLIP = 12;

/**
 * Reads the rendered RGBA colour at a page-absolute CSS-pixel coordinate by
 * taking a real (clipped) screenshot — the composited frame Playwright/
 * Chromium actually produced — and decoding it back in-page through an
 * `<img>` + 2D canvas. Reading straight off the live WebGL canvas
 * (`drawImage`/`toDataURL` on it directly) is not reliable here since the app
 * doesn't set `preserveDrawingBuffer`, so this screenshot round-trip is the
 * robust way to get a real pixel value.
 */
async function readPixel(page: Page, pageX: number, pageY: number) {
  const buf = await page.screenshot({
    clip: { x: pageX - CLIP / 2, y: pageY - CLIP / 2, width: CLIP, height: CLIP },
  });
  const dataUrl = `data:image/png;base64,${buf.toString('base64')}`;
  return page.evaluate((dataUrl) => {
    return new Promise<[number, number, number, number]>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const tmp = document.createElement('canvas');
        tmp.width = img.naturalWidth;
        tmp.height = img.naturalHeight;
        const ctx = tmp.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        // Centre of the clipped image — same point regardless of device pixel ratio.
        const x = Math.floor(img.naturalWidth / 2);
        const y = Math.floor(img.naturalHeight / 2);
        const data = ctx.getImageData(x, y, 1, 1).data;
        resolve([data[0], data[1], data[2], data[3]]);
      };
      img.onerror = () => reject(new Error('screenshot image failed to load'));
      img.src = dataUrl;
    });
  }, dataUrl);
}

test('selecting the floor gives it the same emissive glow a selected wall already has', async ({
  page,
}, testInfo) => {
  // The 3D scene (lazy-loaded, plus a WebGL shader/texture warm-up) and several
  // screenshot round-trips can run well past the default 30s budget on an
  // emulated touch browser in a headless/CI-like environment under load.
  test.setTimeout(300_000);
  await openFurnishView(page);

  // The Scene component is lazy-loaded behind a "Loading 3D view…" placeholder
  // (see App.tsx's Suspense) — the dock buttons render immediately, but the
  // canvas itself can take a while to mount on a loaded machine.
  await expect(page.locator('.scene-loading')).toBeHidden({ timeout: 90_000 });
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  const canvasBox = await canvas.boundingBox();
  if (!canvasBox) throw new Error('canvas not found');

  // Slightly below dead-centre: the default orbit camera looks down at the
  // room, so the floor's near edge sits in the lower half of the canvas (same
  // convention as e2e/bottom-dock.spec.ts). Coordinates are page-absolute
  // (canvas origin + point), since screenshots/clips are page-relative.
  const point = { x: canvasBox.x + canvasBox.width / 2, y: canvasBox.y + canvasBox.height * 0.65 };

  // The placeholder clearing doesn't guarantee WebGL has painted its first
  // real frame yet — poll the actual pixel until it settles on the floor's
  // warm tan rather than the page's neutral background, instead of guessing
  // a fixed delay (unreliable on a heavily loaded machine).
  let before: [number, number, number, number] = [0, 0, 0, 0];
  await expect(async () => {
    before = await readPixel(page, point.x, point.y);
    // The floor colour (#c9a878) is warm: red clearly above blue. The page's
    // own background/placeholder colours are all near-neutral grays instead.
    expect(before[0] - before[2]).toBeGreaterThan(20);
  }).toPass({ timeout: 150_000, intervals: [300, 800, 1500] });
  console.log(`[${testInfo.project.name}] floor pixel before selection: rgba(${before.join(', ')})`);

  mkdirSync(testInfo.outputDir, { recursive: true });
  await page.screenshot({ path: `${testInfo.outputDir}/floor-unselected-${testInfo.project.name}.png` });

  await canvas.click({ position: { x: point.x - canvasBox.x, y: point.y - canvasBox.y } });

  // The floor-colour bar renders — the click reached the floor and the
  // existing selection state updated (unchanged by this fix; the emissive
  // glow is the new part checked below).
  await expect(page.getByRole('toolbar', { name: 'Floor actions' })).toBeVisible({ timeout: 60_000 });

  await page.screenshot({ path: `${testInfo.outputDir}/floor-selected-${testInfo.project.name}.png` });

  // Poll here too: the re-render carrying the new emissive value also needs a
  // beat to actually paint under load.
  let selected: [number, number, number, number] = [0, 0, 0, 0];
  await expect(async () => {
    selected = await readPixel(page, point.x, point.y);
    const dB = selected[2] - before[2];
    // `SELECT_EMISSIVE` (#2f6fdd, rgb(47, 111, 221)) is a blue with far more
    // blue than red or green. The floor's own colour here (#c9a878, a warm
    // tan) has very little blue, so adding that emissive term must show up as
    // a real blue-channel jump, clearly bigger than the red/green jump — true
    // only once the mesh's material has actually gained the emissive glow.
    expect(dB).toBeGreaterThan(15);
  }).toPass({ timeout: 60_000, intervals: [300, 800, 1500] });

  const dR = selected[0] - before[0];
  const dG = selected[1] - before[1];
  const dB = selected[2] - before[2];
  console.log(`[${testInfo.project.name}] floor pixel while selected: rgba(${selected.join(', ')})`);
  console.log(`[${testInfo.project.name}] delta rgb: (${dR}, ${dG}, ${dB})`);
  expect(dB).toBeGreaterThan(dR);
  expect(dB).toBeGreaterThan(dG);

  // Deselecting (Escape, the standard deselect shortcut) turns the glow back
  // off — the bar closes and the pixel returns close to its original colour.
  await page.keyboard.press('Escape');
  await expect(page.getByRole('toolbar', { name: 'Floor actions' })).toBeHidden();

  let after: [number, number, number, number] = [0, 0, 0, 0];
  await expect(async () => {
    after = await readPixel(page, point.x, point.y);
    expect(Math.abs(after[2] - before[2])).toBeLessThan(10);
  }).toPass({ timeout: 60_000, intervals: [300, 800, 1500] });
  console.log(`[${testInfo.project.name}] floor pixel after deselecting: rgba(${after.join(', ')})`);
});
