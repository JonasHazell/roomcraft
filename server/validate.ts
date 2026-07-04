import type { Design } from '../src/types.ts';
import { floorPolygon, pointInPolygon } from '../src/lib/polygon.ts';
import { DOOR_CLEARANCE, convexOverlap, doorClearanceZones, footprint } from './geom.ts';
import { overlapErrors, reachabilityErrors } from './reachability.ts';
import type { ResolvedProposals } from './schema.ts';

/**
 * Kontrollerar de hårda kraven som går att avgöra maskinellt på de färdiglösta
 * möblerna (rotation/position redan uppslagna i orient.ts).
 * Returnerar en lista svenska felbeskrivningar (tom = godkänt).
 */
export function validateProposals(data: ResolvedProposals, design: Design): string[] {
  const errors: string[] = [];
  const poly = floorPolygon(design.walls);
  const zones = doorClearanceZones(design);

  if (data.proposals.length === 0) errors.push('Svaret innehåller inga förslag.');

  for (const proposal of data.proposals) {
    for (const f of proposal.furniture) {
      const corners = footprint(f, 0.02);
      if (!corners.every((c) => pointInPolygon(c, poly))) {
        errors.push(
          `Förslag "${proposal.title}": "${f.name}" (${f.size.width}×${f.size.depth} m vid x=${f.x}, z=${f.z}) sticker utanför rummet.`,
        );
        continue;
      }
      if (f.kind === 'rug') continue;
      for (const zone of zones) {
        // Väggmonterat ovanför dörrhöjden blockerar inte passagen.
        if (f.elevation >= zone.doorTop) continue;
        if (convexOverlap(corners, zone.quad)) {
          errors.push(
            `Förslag "${proposal.title}": "${f.name}" blockerar dörrsvepet (${DOOR_CLEARANCE} m fritt) framför ${zone.label}.`,
          );
        }
      }
    }
    errors.push(...overlapErrors(proposal.furniture, proposal.title));
    errors.push(...reachabilityErrors(proposal.furniture, design, proposal.title));
  }
  return errors;
}
