import type { Design, Point } from '../src/types.ts';
import { dist, floorPolygon, pointInPolygon } from '../src/lib/polygon.ts';
import { footprint, frontDir } from './geom.ts';
import type { ResolvedFurniture, ResolvedProposals } from './schema.ts';

/**
 * How far a chair may sit from a desk and still be counted as *that desk's*
 * chair. Beyond this it is treated as unrelated seating and left alone.
 */
const MAX_PAIR_DIST = 2.5;

/**
 * How far the chair's back is tucked under the desk's front edge, meters. A
 * pulled-in desk chair reads as belonging to the desk; chairs are allowed to
 * overlap a work surface (see reachability/autofix), so a small tuck is fine.
 */
const TUCK = 0.1;

/** rotationY (snapped to a quarter turn) whose front (local +z) points along dir. */
function faceRotation(dir: Point): number {
  const raw = Math.atan2(dir.x, dir.z);
  const HALF_PI = Math.PI / 2;
  return Math.round(raw / HALF_PI) * HALF_PI;
}

/**
 * Seats each desk's chair centred on the desk's working (front, long) side and
 * facing the desk, instead of wherever the model dropped it — which is often at
 * a short end. The desk's front already requires a clear, reachable access zone
 * ("fri_yta_framfor_m"), so the canonical spot is guaranteed to be inside the
 * room and usable; we only fall back to the model's placement if, defensively,
 * the computed centre lands outside the floor.
 *
 * Only `desk` chairs are moved. Dining chairs (which ring a `table` on any side)
 * are left untouched: a chair is skipped if it sits closer to a dining table
 * than to the desk that would claim it.
 *
 * Runs after the auto-fix pass so it aligns to the desks' final positions, and
 * because a chair tucked under its desk must not then be nudged away as an
 * "overlap" (desks count as work surfaces for the chair-tuck exception).
 */
export function placeDeskChairs(data: ResolvedProposals, design: Design): ResolvedProposals {
  const poly = floorPolygon(design.walls);
  return {
    proposals: data.proposals.map((p) => {
      const items = p.furniture.map((f) => ({ ...f }));
      const desks = items.filter((f) => f.kind === 'desk');
      if (desks.length === 0) return { ...p, furniture: items };

      const chairs = items.filter((f) => f.kind === 'chair');
      const tables = items.filter((f) => f.kind === 'table');
      const nearestTable = (c: ResolvedFurniture): number =>
        tables.reduce((m, t) => Math.min(m, dist(pos(c), pos(t))), Infinity);

      // Greedy nearest-first pairing so each desk claims one chair and no chair
      // is claimed twice, even with several desks in the room.
      const pairs: { desk: ResolvedFurniture; chair: ResolvedFurniture; d: number }[] = [];
      for (const desk of desks) {
        for (const chair of chairs) {
          const d = dist(pos(desk), pos(chair));
          if (d > MAX_PAIR_DIST) continue;
          if (d > nearestTable(chair)) continue; // belongs to a dining table, not the desk
          pairs.push({ desk, chair, d });
        }
      }
      pairs.sort((a, b) => a.d - b.d);

      const usedDesks = new Set<ResolvedFurniture>();
      const usedChairs = new Set<ResolvedFurniture>();
      for (const { desk, chair } of pairs) {
        if (usedDesks.has(desk) || usedChairs.has(chair)) continue;
        usedDesks.add(desk);
        usedChairs.add(chair);

        const fwd = frontDir(desk.rotationY); // the desk's front (working) side
        const offset = Math.max(
          desk.size.depth / 2,
          desk.size.depth / 2 + chair.size.depth / 2 - TUCK,
        );
        const seated: ResolvedFurniture = {
          ...chair,
          x: desk.x + fwd.x * offset,
          z: desk.z + fwd.z * offset,
          rotationY: faceRotation({ x: -fwd.x, z: -fwd.z }), // face the desk
        };
        // Defensive: only relocate if the whole footprint stays inside the room
        // (the desk's front access zone normally guarantees this); otherwise keep
        // the model's placement rather than push the chair through a wall.
        if (!footprint(seated, 0.02).every((c) => pointInPolygon(c, poly))) continue;

        chair.x = seated.x;
        chair.z = seated.z;
        chair.rotationY = seated.rotationY;
      }

      return { ...p, furniture: items };
    }),
  };
}

function pos(f: ResolvedFurniture): Point {
  return { x: f.x, z: f.z };
}
