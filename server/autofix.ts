import type { Design, Point } from '../src/types.ts';
import { floorPolygon } from '../src/lib/polygon.ts';
import { furnitureCorners, furnitureFits } from '../src/lib/collision.ts';
import type { ResolvedFurniture, ResolvedProposals } from './schema.ts';

// Rings of candidate offsets tried when relocating a piece that doesn't fit.
// Deliberately short-range so a broken piece is nudged to the nearest free spot
// rather than teleported across the room.
const SEARCH_RADII = [0.1, 0.2, 0.3, 0.45, 0.6, 0.8, 1.0, 1.2];
const SEARCH_DIRS = 12;

type Footprint = { position: Point; rotationY: number; size: ResolvedFurniture['size'] };

function footprintOf(f: ResolvedFurniture): Footprint {
  return { position: { x: f.x, z: f.z }, rotationY: f.rotationY, size: f.size };
}

/**
 * Obstacle footprints for testing `target`, honouring the same overlap
 * exceptions as the validator: rugs may lie under anything (never obstacles) and
 * a chair may be pushed under a table/desk/box (those aren't obstacles for it).
 */
function obstaclesFor(target: ResolvedFurniture, others: ResolvedFurniture[]): Point[][] {
  return others
    .filter((o) => {
      if (o.kind === 'rug') return false;
      if (target.kind === 'chair' && (o.kind === 'table' || o.kind === 'desk' || o.kind === 'box'))
        return false;
      return true;
    })
    .map((o) => furnitureCorners(footprintOf(o)));
}

/** Nearest offset (in the search rings) where `item` fits, or null if none does. */
function findFit(
  item: Footprint,
  poly: Point[],
  walls: Design['walls'],
  obstacles: Point[][],
): Point | null {
  for (const r of SEARCH_RADII) {
    for (let k = 0; k < SEARCH_DIRS; k++) {
      const ang = (2 * Math.PI * k) / SEARCH_DIRS;
      const cand = {
        x: item.position.x + Math.cos(ang) * r,
        z: item.position.z + Math.sin(ang) * r,
      };
      if (furnitureFits({ ...item, position: cand }, poly, walls, obstacles)) return cand;
    }
  }
  return null;
}

/**
 * Cheap, deterministic cleanup applied before asking the model to repair: any
 * piece whose footprint pokes outside the room, crosses a wall or overlaps a
 * neighbour is nudged to the nearest free spot. Rugs are left in place (they may
 * sit under anything); pieces that already fit are untouched, so wall-flush
 * furniture keeps its snapped position. Anything unresolved within reach is left
 * as-is for the LLM. This removes the easy geometry violations without spending a
 * (slow, costly) repair round on them.
 */
export function autoFixProposals(data: ResolvedProposals, design: Design): ResolvedProposals {
  const poly = floorPolygon(design.walls);
  return {
    proposals: data.proposals.map((p) => {
      const items = p.furniture.map((f) => ({ ...f }));
      for (let i = 0; i < items.length; i++) {
        const f = items[i];
        if (f.kind === 'rug') continue;
        // Neighbours reflect earlier fixes in this pass (positions are mutated in place).
        const obstacles = obstaclesFor(
          f,
          items.filter((_, j) => j !== i),
        );
        const foot = footprintOf(f);
        if (furnitureFits(foot, poly, design.walls, obstacles)) continue;
        const fixed = findFit(foot, poly, design.walls, obstacles);
        if (fixed) {
          f.x = fixed.x;
          f.z = fixed.z;
        }
      }
      return { ...p, furniture: items };
    }),
  };
}
