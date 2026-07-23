import { test, expect, type Page } from '@playwright/test';

/**
 * #406: `findClearSpot` (src/lib/collision.ts) used to only require a
 * newly-placed piece to not *overlap* existing furniture, so a freshly-added
 * piece could land within a couple of centimeters of a piece already in the
 * room — visually flush/embedded. It now also enforces a minimum breathing
 * margin (`CLEAR_SPOT_MIN_GAP`) between the new piece and every other piece,
 * on top of the ordinary no-overlap check. This drives the exact repro from
 * the issue — furnish a living-room template, add a Sofa (lands at room
 * center), then add a Chair via the picker — and asserts the real gap between
 * their footprints, read from the persisted design, clears the margin.
 */

type Placed = { position: { x: number; z: number }; rotationY: number; size: { width: number; depth: number } };

/** Every placed piece's geometry, read straight from the persisted
 *  `roomcraft:current` localStorage blob (mirrors `furniturePositions` in
 *  furniture-multi-select.spec.ts, extended with size/rotation for a
 *  footprint gap calculation). */
async function furniturePieces(page: Page): Promise<Placed[]> {
  return page.evaluate(() => {
    const raw = localStorage.getItem('roomcraft:current');
    if (!raw) return [];
    const out: Placed[] = [];
    const walk = (v: unknown): void => {
      if (Array.isArray(v)) {
        v.forEach(walk);
        return;
      }
      if (v && typeof v === 'object') {
        const o = v as Record<string, unknown>;
        if (Array.isArray(o.furniture) && Array.isArray(o.proposals)) {
          out.push(...(o.furniture as Placed[]));
          return;
        }
        Object.values(o).forEach(walk);
      }
    };
    walk(JSON.parse(raw));
    return out;
  });
}

/** Rotated-rectangle corners, matching `rectCorners` in src/lib/polygon.ts. */
function corners(p: Placed): Array<{ x: number; z: number }> {
  const hw = p.size.width / 2;
  const hd = p.size.depth / 2;
  const cos = Math.cos(p.rotationY);
  const sin = Math.sin(p.rotationY);
  return (
    [
      [-hw, -hd],
      [hw, -hd],
      [hw, hd],
      [-hw, hd],
    ] as const
  ).map(([lx, lz]) => ({
    x: p.position.x + lx * cos + lz * sin,
    z: p.position.z - lx * sin + lz * cos,
  }));
}

/** SAT separation gap between two convex quads (0 if touching/overlapping) —
 *  the largest per-axis projection gap across both quads' edge normals. */
function quadGap(a: Array<{ x: number; z: number }>, b: Array<{ x: number; z: number }>): number {
  const axes = (poly: Array<{ x: number; z: number }>) =>
    poly.map((p, i) => {
      const q = poly[(i + 1) % poly.length];
      const len = Math.hypot(q.x - p.x, q.z - p.z) || 1;
      return { x: -(q.z - p.z) / len, z: (q.x - p.x) / len };
    });
  let maxGap = -Infinity;
  for (const axis of [...axes(a), ...axes(b)]) {
    const proj = (poly: Array<{ x: number; z: number }>) => poly.map((p) => p.x * axis.x + p.z * axis.z);
    const pa = proj(a);
    const pb = proj(b);
    const gap = Math.max(Math.min(...pb) - Math.max(...pa), Math.min(...pa) - Math.max(...pb));
    maxGap = Math.max(maxGap, gap);
  }
  return Math.max(maxGap, 0);
}

test('a newly auto-placed piece keeps a breathing-room gap from existing furniture', async ({ page }) => {
  test.setTimeout(90_000);

  await page.goto('/');
  await page.getByRole('button', { name: /create a room/i }).click();
  await page.getByLabel(/room name/i).fill('Clear spot margin test');
  await page.getByRole('button', { name: /living room/i }).click();
  await page.getByRole('button', { name: /furnish this room/i }).click();

  await expect(page.locator('.scene-loading')).toBeHidden({ timeout: 90_000 });

  // Add a Sofa first — it lands at the room's center, exactly the issue's repro.
  await page.getByRole('button', { name: 'Add furniture' }).click();
  await page.getByRole('button', { name: 'Sofa', exact: true }).click();
  await page.getByRole('button', { name: 'OK', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Duplicate' })).toBeVisible();

  // Then a Chair via the same picker flow — the new auto-placement search runs
  // to steer it clear of the sofa already occupying the center.
  await page.getByRole('button', { name: 'Add furniture' }).click();
  await page.getByRole('button', { name: 'Chair', exact: true }).click();
  await page.getByRole('button', { name: 'OK', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Duplicate' })).toBeVisible();

  await expect(page.getByRole('alert')).toHaveCount(0);

  const pieces = await furniturePieces(page);
  expect(pieces).toHaveLength(2);

  const gap = quadGap(corners(pieces[0]), corners(pieces[1]));
  // The margin findClearSpot enforces (CLEAR_SPOT_MIN_GAP in src/lib/collision.ts)
  // is 0.18 m; allow a hair of floating-point slack.
  expect(gap).toBeGreaterThanOrEqual(0.18 - 1e-3);
});
