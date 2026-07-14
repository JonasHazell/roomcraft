import type { Design, FurnitureItem, Point } from '../types';
import { runValidation } from './validation/engine';
import { isCoffeeTable, isDiningTable } from './validation/ruleHelpers';
import { clampFurniture, furnitureFits, furnitureObstacles } from './collision';
import { floorPolygon, frontDir, polygonBounds, polygonCenter } from './polygon';

/**
 * A local, deterministic "tidy up the room" optimiser — the non-AI counterpart to
 * the AI furnishing feature. It keeps the exact set of pieces and only **moves and
 * rotates** them, searching for the layout with the highest design score
 * ({@link runValidation}'s `total`). The scoring engine and the collision
 * geometry are reused wholesale: every candidate layout is scored by the real
 * rule catalog and rejected unless it {@link furnitureFits} (inside the walls, no
 * overlaps), so the result is always a valid arrangement and never worse than the
 * one it started from.
 *
 * The search is a greedy coordinate descent: pieces are placed anchors-first
 * (beds/sofas before their satellites), each piece hops to the best-scoring spot
 * from a small set of structured candidates (flush against a wall facing the
 * room, a coarse interior grid, small nudges, and relations to nearby anchors),
 * and a few passes let satellites follow anchors that moved. It is deliberately
 * time-boxed so a tap feels instant even in a busy room.
 */

/** A trial pose for one piece: floor position plus facing. */
interface Placement {
  x: number;
  z: number;
  rotationY: number;
}

/** An exterior floor edge with its inward normal — the basis for wall-flush poses. */
interface Edge {
  a: Point;
  b: Point;
  /** Unit vector along the edge (a → b). */
  dir: Point;
  /** Unit vector pointing into the room. */
  normal: Point;
  len: number;
}

/** Wall-clock ceiling for the whole search, so a tap stays snappy in a full room. */
const TIME_BUDGET_MS = 1500;
/** How many times the whole piece set is re-considered (satellites chase moved anchors). */
const MAX_PASSES = 3;
/** Gap left between a wall-hugging piece and the wall (m). */
const WALL_GAP = 0.03;
/** Spacing of sampled positions along a wall (m). */
const WALL_STEP = 0.5;
/** Spacing of the coarse interior placement grid (m). */
const GRID_STEP = 0.85;
/** Caps on how many candidates of each family survive, to keep the eval budget bounded. */
const WALL_CAP = 14;
const GRID_CAP = 12;

const HALF_PI = Math.PI / 2;

/** World direction of a furniture right side (local +x rotated by rotationY). */
function rightDir(r: number): Point {
  return { x: Math.cos(r), z: -Math.sin(r) };
}

function addScaled(p: Point, d: Point, k: number): Point {
  return { x: p.x + d.x * k, z: p.z + d.z * k };
}

function footprintArea(f: FurnitureItem): number {
  return f.size.width * f.size.depth;
}

/**
 * Placement order weight for a kind: lower goes first. Anchors (bed, sofa, big
 * storage, dining table) are positioned before the satellites that depend on
 * them (nightstands beside the bed, a coffee table in front of the sofa, a rug
 * under either), so the satellites can react to where the anchor landed.
 */
function rankOf(f: FurnitureItem): number {
  switch (f.kind) {
    case 'bed':
    case 'sofa':
      return 0;
    case 'wardrobe':
    case 'bookshelf':
    case 'desk':
      return 1;
    case 'table':
      return isDiningTable(f) ? 1 : 4; // a coffee table waits for its sofa
    case 'tv':
      return 2;
    case 'rug':
      return 5; // last: it centres on whatever seating/table ended up where
    default:
      return 3;
  }
}

/** Builds the exterior edges with inward normals from the floor polygon. */
function buildEdges(poly: Point[]): Edge[] {
  const c = polygonCenter(poly);
  const edges: Edge[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    if (len < 1e-6) continue;
    const dir = { x: (b.x - a.x) / len, z: (b.z - a.z) / len };
    const cand = { x: -dir.z, z: dir.x };
    const mid = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };
    const inward = (c.x - mid.x) * cand.x + (c.z - mid.z) * cand.z > 0;
    const normal = inward ? cand : { x: -cand.x, z: -cand.z };
    edges.push({ a, b, dir, normal, len });
  }
  return edges;
}

/** Evenly thins a list down to at most `cap` entries (keeps a deterministic spread). */
function sample<T>(items: T[], cap: number): T[] {
  if (items.length <= cap) return items;
  const out: T[] = [];
  const stride = items.length / cap;
  for (let i = 0; i < cap; i++) out.push(items[Math.floor(i * stride)]);
  return out;
}

/** Poses flush against each wall, back to the wall and front facing the room. */
function wallPlacements(piece: FurnitureItem, edges: Edge[]): Placement[] {
  const out: Placement[] = [];
  const back = piece.size.depth / 2 + WALL_GAP;
  const half = piece.size.width / 2;
  for (const e of edges) {
    const rotationY = Math.atan2(e.normal.x, e.normal.z); // frontDir === inward normal
    if (e.len < piece.size.width) {
      const mid = { x: (e.a.x + e.b.x) / 2, z: (e.a.z + e.b.z) / 2 };
      const p = addScaled(mid, e.normal, back);
      out.push({ x: p.x, z: p.z, rotationY });
      continue;
    }
    for (let t = half; t <= e.len - half + 1e-6; t += WALL_STEP) {
      const p = addScaled(addScaled(e.a, e.dir, t), e.normal, back);
      out.push({ x: p.x, z: p.z, rotationY });
    }
  }
  return out;
}

/** A coarse interior grid of positions, tried at two orthogonal facings. */
function gridPlacements(bounds: ReturnType<typeof polygonBounds>): Placement[] {
  const out: Placement[] = [];
  for (let x = bounds.minX + GRID_STEP / 2; x <= bounds.maxX; x += GRID_STEP) {
    for (let z = bounds.minZ + GRID_STEP / 2; z <= bounds.maxZ; z += GRID_STEP) {
      out.push({ x, z, rotationY: 0 });
      out.push({ x, z, rotationY: HALF_PI });
    }
  }
  return out;
}

/** Small offsets around the current pose — nails distance-sensitive rules (sofa↔coffee table). */
function nudgePlacements(piece: FurnitureItem): Placement[] {
  const { x, z } = piece.position;
  const out: Placement[] = [];
  for (const d of [0.15, 0.3, -0.15, -0.3]) {
    out.push({ x: x + d, z, rotationY: piece.rotationY });
    out.push({ x, z: z + d, rotationY: piece.rotationY });
  }
  return out;
}

/** High-value poses relative to nearby anchors (nightstand↔bed, coffee table↔sofa, …). */
function relationalPlacements(piece: FurnitureItem, others: FurnitureItem[]): Placement[] {
  const out: Placement[] = [];
  const of = (kind: FurnitureItem['kind']) => others.filter((f) => f.kind === kind);

  if (piece.kind === 'nightstand') {
    for (const bed of of('bed')) {
      const front = frontDir(bed.rotationY);
      const right = rightDir(bed.rotationY);
      const headShift = -(bed.size.depth / 2 - piece.size.depth / 2); // toward the head end
      const side = bed.size.width / 2 + piece.size.width / 2 + 0.01;
      for (const s of [1, -1]) {
        const c = addScaled(addScaled(bed.position, front, headShift), right, s * side);
        out.push({ x: c.x, z: c.z, rotationY: bed.rotationY });
      }
    }
  } else if (isCoffeeTable(piece)) {
    for (const sofa of of('sofa')) {
      const front = frontDir(sofa.rotationY);
      const c = addScaled(sofa.position, front, sofa.size.depth / 2 + 0.38 + piece.size.depth / 2);
      out.push({ x: c.x, z: c.z, rotationY: sofa.rotationY });
    }
  } else if (piece.kind === 'rug') {
    for (const sofa of of('sofa')) {
      const c = addScaled(sofa.position, frontDir(sofa.rotationY), sofa.size.depth / 2);
      out.push({ x: c.x, z: c.z, rotationY: sofa.rotationY });
    }
    for (const table of others.filter(isDiningTable)) {
      out.push({ x: table.position.x, z: table.position.z, rotationY: table.rotationY });
    }
  } else if (piece.kind === 'chair') {
    for (const table of others.filter(isDiningTable)) {
      const front = frontDir(table.rotationY);
      const right = rightDir(table.rotationY);
      const sides: Array<[Point, number]> = [
        [front, table.size.depth / 2],
        [{ x: -front.x, z: -front.z }, table.size.depth / 2],
        [right, table.size.width / 2],
        [{ x: -right.x, z: -right.z }, table.size.width / 2],
      ];
      for (const [d, halfExtent] of sides) {
        const c = addScaled(table.position, d, halfExtent + 0.05 + piece.size.depth / 2);
        out.push({ x: c.x, z: c.z, rotationY: Math.atan2(-d.x, -d.z) }); // face the table
      }
    }
  } else if (piece.kind === 'tv') {
    for (const sofa of of('sofa')) {
      const front = frontDir(sofa.rotationY);
      const c = addScaled(sofa.position, front, 2.5);
      out.push({ x: c.x, z: c.z, rotationY: Math.atan2(-front.x, -front.z) }); // face the sofa
    }
  }
  return out;
}

/** The full, budget-capped candidate set for one piece, high-value families first. */
function candidatesFor(
  piece: FurnitureItem,
  edges: Edge[],
  bounds: ReturnType<typeof polygonBounds>,
  others: FurnitureItem[],
): Placement[] {
  return [
    { x: piece.position.x, z: piece.position.z, rotationY: piece.rotationY }, // keep current
    ...relationalPlacements(piece, others),
    ...nudgePlacements(piece),
    ...sample(wallPlacements(piece, edges), WALL_CAP),
    ...sample(gridPlacements(bounds), GRID_CAP),
  ];
}

/**
 * Returns a rearranged copy of `design.furniture` (same pieces and ids, new
 * positions/rotations) that scores at least as high as the current layout — and,
 * whenever the search finds nothing better, the **original array by reference**
 * so callers can treat it as a no-op. See the module doc for the strategy.
 */
export function autoArrange(design: Design): FurnitureItem[] {
  const poly = floorPolygon(design.walls);
  if (poly.length < 3 || design.furniture.length === 0) return design.furniture;

  const base = runValidation(design).total;
  if (base === null) return design.furniture; // no rules apply — nothing to optimise

  const edges = buildEdges(poly);
  const bounds = polygonBounds(poly);
  const start = performance.now();
  const timeUp = () => performance.now() - start > TIME_BUDGET_MS;

  const work: FurnitureItem[] = design.furniture.map((f) => ({
    ...f,
    position: { ...f.position },
    size: { ...f.size },
  }));
  const order = work
    .map((_, i) => i)
    .sort((a, b) => rankOf(work[a]) - rankOf(work[b]) || footprintArea(work[b]) - footprintArea(work[a]));

  const scoreOf = () => runValidation({ ...design, furniture: work }).total ?? 0;

  let current = base;
  for (let pass = 0; pass < MAX_PASSES && !timeUp(); pass++) {
    const passStart = current;
    for (const i of order) {
      if (timeUp()) break;
      const piece = work[i];
      const obstacles = furnitureObstacles(work, piece.kind, piece.id);
      const others = work.filter((_, j) => j !== i);
      let bestScore = current; // keeping the piece where it is is always allowed
      let best: Placement = { x: piece.position.x, z: piece.position.z, rotationY: piece.rotationY };
      for (const c of candidatesFor(piece, edges, bounds, others)) {
        if (timeUp()) break;
        const trial: FurnitureItem = { ...piece, position: { x: c.x, z: c.z }, rotationY: c.rotationY };
        if (!furnitureFits(trial, poly, design.walls, obstacles)) continue;
        work[i] = trial;
        const s = scoreOf();
        if (s > bestScore + 1e-9) {
          bestScore = s;
          best = c;
        }
      }
      work[i] = { ...piece, position: { x: best.x, z: best.z }, rotationY: best.rotationY };
      current = bestScore;
    }
    if (current <= passStart + 1e-9) break; // a whole pass changed nothing — converged
  }

  if (current <= base + 1e-9) return design.furniture; // couldn't do better — no-op
  return work.map((f) => clampFurniture(f, poly));
}
