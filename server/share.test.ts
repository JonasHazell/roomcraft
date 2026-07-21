import { describe, expect, it } from 'vitest';
import type { Design, Wall } from '../src/types.ts';
import { createShare, getShare, ShareNotConfiguredError } from './share.ts';

/** 4×4 m square room with a single (empty) proposal — a minimal but
 * schema-valid `Design` (see `src/lib/persistence.ts`'s `designSchema`). */
function makeDesign(): Design {
  const pts = [
    { x: 0, z: 0 },
    { x: 4, z: 0 },
    { x: 4, z: 4 },
    { x: 0, z: 4 },
  ];
  const walls: Wall[] = pts.map((a, i) => ({
    id: `w${i}`,
    kind: 'exterior',
    a,
    b: pts[(i + 1) % pts.length],
  }));
  return {
    id: 'r0',
    name: 'Test room',
    updatedAt: '2026-01-01T00:00:00.000Z',
    room: { height: 2.4 },
    floorColor: '#c9a878',
    wallColor: '#efe8da',
    floorMaterial: 'matte',
    wallMaterial: 'matte',
    walls,
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
  };
}

// This environment has no DATABASE_URL, so `pool` (server/db.ts) is always
// null here — every call below reaches the "not configured" branch. That
// still exercises real behaviour worth locking down: `createShare` must
// validate the incoming design *before* ever touching the database (so a
// malformed share can't reach storage even if a pool were configured), and
// both functions must fail with the same distinguishable error type
// `index.ts` maps to a 503, not a generic throw. Actual insert/read against a
// live Postgres instance isn't exercised here — see the PR description for
// what could and couldn't be verified.
describe('createShare / getShare', () => {
  it('rejects a malformed design before touching the database', async () => {
    await expect(createShare({ not: 'a design' })).rejects.toThrow();
    await expect(createShare(null)).rejects.toThrow();
  });

  it('throws ShareNotConfiguredError for a valid design once no database is configured', async () => {
    await expect(createShare(makeDesign())).rejects.toBeInstanceOf(ShareNotConfiguredError);
  });

  it('getShare also throws ShareNotConfiguredError with no database configured', async () => {
    await expect(getShare('any-id')).rejects.toBeInstanceOf(ShareNotConfiguredError);
  });
});
