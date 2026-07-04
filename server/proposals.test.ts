import { describe, expect, it } from 'vitest';
import type { Design, Wall } from '../src/types.ts';
import { frontDir } from './geom.ts';
import { resolveProposals } from './orient.ts';
import { overlapErrors, reachabilityErrors } from './reachability.ts';
import type { AiFurniture, ResolvedFurniture } from './schema.ts';

/** 4×4 m fyrkantsrum med en dörr mitt på nedre väggen (z=0). */
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
  name: 'Låda',
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
  name: 'Garderob',
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

describe('resolveProposals — orientering', () => {
  it('snäpper en againstWall-garderob flush mot närmaste vägg med framsidan ut i rummet', () => {
    const design = makeRoom();
    const resolved = resolveProposals(
      { proposals: [{ title: 't', concept: 'c', furniture: [aiItem({})] }] },
      design,
    );
    const g = resolved.proposals[0].furniture[0];
    // Övre väggen är z=4; ryggen (djup 0.6) ska stå dikt an → centrum ≈ 4 − 0.3 − gap.
    expect(g.z).toBeCloseTo(3.68, 2);
    // Framsidan ska peka in i rummet (−z).
    const f = frontDir(g.rotationY);
    expect(f.z).toBeLessThan(-0.9);
    expect(Math.abs(f.x)).toBeLessThan(0.01);
  });

  it('vänder en fristående stols framsida mot bordet (facing-punkten)', () => {
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
                name: 'Stol',
                x: 2,
                z: 1,
                againstWall: false,
                facing: { x: 2, z: 3 }, // bordet ligger norrut
                size: { width: 0.45, depth: 0.45, height: 0.9 },
              }),
            ],
          },
        ],
      },
      design,
    );
    const f = frontDir(resolved.proposals[0].furniture[0].rotationY);
    expect(f.z).toBeGreaterThan(0.9); // framsidan pekar +z, mot bordet
  });
});

describe('overlapErrors', () => {
  it('flaggar två överlappande lådor', () => {
    const errs = overlapErrors([box({ name: 'A', x: 2 }), box({ name: 'B', x: 2.5 })], 't');
    expect(errs).toHaveLength(1);
  });

  it('tillåter en stol inskjuten under ett bord', () => {
    const table = box({ kind: 'table', name: 'Bord', size: { width: 1.4, depth: 0.8, height: 0.75 } });
    const chair = box({ kind: 'chair', name: 'Stol', size: { width: 0.45, depth: 0.45, height: 0.9 } });
    expect(overlapErrors([table, chair], 't')).toHaveLength(0);
  });
});

describe('reachabilityErrors', () => {
  it('godkänner en möbel med fri väg från dörren', () => {
    const design = makeRoom();
    const table = box({ kind: 'table', name: 'Bord', z: 2, size: { width: 1, depth: 0.8, height: 0.75 } });
    expect(reachabilityErrors([table], design, 't')).toHaveLength(0);
  });

  it('flaggar en möbel som är instängd bakom en avdelande möbel', () => {
    const design = makeRoom();
    // Avdelare tvärs över rummet vid z=2 → separerar dörren (nere) från övre halvan.
    const divider = box({
      name: 'Avdelare',
      x: 2,
      z: 2,
      size: { width: 3.95, depth: 0.6, height: 2 },
    });
    const trapped = box({
      kind: 'table',
      name: 'Lekbord',
      x: 2,
      z: 3.2,
      size: { width: 1, depth: 0.8, height: 0.5 },
    });
    const errs = reachabilityErrors([divider, trapped], design, 't');
    expect(errs.some((e) => e.includes('Lekbord'))).toBe(true);
  });
});
