import { describe, expect, it } from 'vitest';
import type { Design, Wall } from '../src/types.ts';
import { frontDir } from './geom.ts';
import { resolveProposals } from './orient.ts';
import { overlapErrors, reachabilityErrors } from './reachability.ts';
import type { AiFurniture, ResolvedFurniture } from './schema.ts';

/** 4×4 m square room with a door in the middle of the bottom wall (z=0). */
function makeRoom(): Design {
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
    schemaVersion: 2,
    name: 'test',
    updatedAt: '',
    room: { height: 2.4, floorColor: '#fff', wallColor: '#fff' },
    walls,
    openings: [
      { id: 'd0', kind: 'door', wallId: 'w0', offset: 1.5, width: 1.0, height: 2.0, elevation: 0 },
    ],
    furniture: [],
  };
}

const box = (over: Partial<ResolvedFurniture>): ResolvedFurniture => ({
  kind: 'box',
  name: 'Box',
  x: 2,
  z: 2,
  rotationY: 0,
  size: { width: 1, depth: 1, height: 1 },
  elevation: 0,
  color: '#000',
  reasoning: '',
  ...over,
});

const aiItem = (over: Partial<AiFurniture>): AiFurniture => ({
  kind: 'wardrobe',
  name: 'Wardrobe',
  x: 2,
  z: 3.7,
  facing: { x: 2, z: 1 },
  againstWall: true,
  size: { width: 1.2, depth: 0.6, height: 2 },
  elevation: 0,
  color: '#000',
  reasoning: '',
  ...over,
});

describe('resolveProposals — orientation', () => {
  it('snaps an againstWall wardrobe flush against the nearest wall with its front facing the room', () => {
    const design = makeRoom();
    const resolved = resolveProposals(
      { proposals: [{ title: 't', concept: 'c', furniture: [aiItem({})] }] },
      design,
    );
    const g = resolved.proposals[0].furniture[0];
    // The top wall is z=4; the back (depth 0.6) should sit flush → center ≈ 4 − 0.3 − gap.
    expect(g.z).toBeCloseTo(3.68, 2);
    // The front should point into the room (−z).
    const f = frontDir(g.rotationY);
    expect(f.z).toBeLessThan(-0.9);
    expect(Math.abs(f.x)).toBeLessThan(0.01);
  });

  it('turns the front of a freestanding chair toward the table (the facing point)', () => {
    const design = makeRoom();
    const resolved = resolveProposals(
      {
        proposals: [
          {
            title: 't',
            concept: 'c',
            furniture: [
              aiItem({
                kind: 'chair',
                name: 'Chair',
                x: 2,
                z: 1,
                againstWall: false,
                facing: { x: 2, z: 3 }, // the table is to the north
                size: { width: 0.45, depth: 0.45, height: 0.9 },
              }),
            ],
          },
        ],
      },
      design,
    );
    const f = frontDir(resolved.proposals[0].furniture[0].rotationY);
    expect(f.z).toBeGreaterThan(0.9); // the front points +z, toward the table
  });
});

describe('overlapErrors', () => {
  it('flags two overlapping boxes', () => {
    const errs = overlapErrors([box({ name: 'A', x: 2 }), box({ name: 'B', x: 2.5 })], 't');
    expect(errs).toHaveLength(1);
  });

  it('allows a chair pushed in under a table', () => {
    const table = box({ kind: 'table', name: 'Table', size: { width: 1.4, depth: 0.8, height: 0.75 } });
    const chair = box({ kind: 'chair', name: 'Chair', size: { width: 0.45, depth: 0.45, height: 0.9 } });
    expect(overlapErrors([table, chair], 't')).toHaveLength(0);
  });
});

describe('reachabilityErrors', () => {
  it('accepts a furniture item with a clear path from the door', () => {
    const design = makeRoom();
    const table = box({ kind: 'table', name: 'Table', z: 2, size: { width: 1, depth: 0.8, height: 0.75 } });
    expect(reachabilityErrors([table], design, 't')).toHaveLength(0);
  });

  it('flags a furniture item trapped behind a dividing piece', () => {
    const design = makeRoom();
    // Divider across the room at z=2 → separates the door (bottom) from the upper half.
    const divider = box({
      name: 'Divider',
      x: 2,
      z: 2,
      size: { width: 3.95, depth: 0.6, height: 2 },
    });
    const trapped = box({
      kind: 'table',
      name: 'Play table',
      x: 2,
      z: 3.2,
      size: { width: 1, depth: 0.8, height: 0.5 },
    });
    const errs = reachabilityErrors([divider, trapped], design, 't');
    expect(errs.some((e) => e.includes('Play table'))).toBe(true);
  });
});
