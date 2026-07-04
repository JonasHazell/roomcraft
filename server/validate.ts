import type { Design } from '../src/types.ts';
import { floorPolygon, pointInPolygon } from '../src/lib/polygon.ts';
import { DOOR_CLEARANCE, convexOverlap, doorClearanceZones, footprint } from './geom.ts';
import { overlapErrors, reachabilityErrors } from './reachability.ts';
import type { ResolvedProposals } from './schema.ts';

/**
 * Checks the hard requirements that can be verified mechanically on the fully
 * resolved furniture (rotation/position already resolved in orient.ts).
 * Returns a list of error descriptions (empty = pass).
 */
export function validateProposals(data: ResolvedProposals, design: Design): string[] {
  const errors: string[] = [];
  const poly = floorPolygon(design.walls);
  const zones = doorClearanceZones(design);

  if (data.proposals.length === 0) errors.push('The response contains no proposals.');

  for (const proposal of data.proposals) {
    for (const f of proposal.furniture) {
      const corners = footprint(f, 0.02);
      if (!corners.every((c) => pointInPolygon(c, poly))) {
        errors.push(
          `Proposal "${proposal.title}": "${f.name}" (${f.size.width}×${f.size.depth} m at x=${f.x}, z=${f.z}) extends outside the room.`,
        );
        continue;
      }
      if (f.kind === 'rug') continue;
      for (const zone of zones) {
        // Wall-mounted items above the door height do not block the passage.
        if (f.elevation >= zone.doorTop) continue;
        if (convexOverlap(corners, zone.quad)) {
          errors.push(
            `Proposal "${proposal.title}": "${f.name}" blocks the door swing (${DOOR_CLEARANCE} m clear) in front of ${zone.label}.`,
          );
        }
      }
    }
    errors.push(...overlapErrors(proposal.furniture, proposal.title));
    errors.push(...reachabilityErrors(proposal.furniture, design, proposal.title));
  }
  return errors;
}
