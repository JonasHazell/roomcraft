import { describe, expect, it } from 'vitest';
import type { Design, Wall } from '../src/types.ts';
import { placeDeskChairs } from './deskChair.ts';
import { frontDir } from './geom.ts';
import type { ResolvedFurniture, ResolvedProposals } from './schema.ts';

/** 4×4 m square room. */
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
    id: 'r0',
    name: 'test',
    updatedAt: '',
    room: { height: 2.4 },
    floorColor: '#fff',
    wallColor: '#fff',
    floorMaterial: 'matte',
    wallMaterial: 'matte',
    walls,
    openings: [],
    furniture: [],
    proposals: [],
    activeProposalId: '',
  };
}

const item = (over: Partial<ResolvedFurniture>): ResolvedFurniture => ({
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

const wrap = (furniture: ResolvedFurniture[]): ResolvedProposals => ({
  proposals: [{ title: 't', concept: 'c', floorColor: '#fff', wallColor: '#fff', furniture }],
});

const seatOf = (r: ResolvedProposals) => r.proposals[0].furniture.find((f) => f.kind === 'chair')!;

describe('placeDeskChairs', () => {
  it('moves a chair from the desk\'s short end to the centre of its working side', () => {
    // Desk facing +z (front along +z, long side is width 1.2). Chair dumped at the short (−x) end.
    const desk = item({ kind: 'desk', name: 'Desk', x: 2, z: 2, rotationY: 0, size: { width: 1.2, depth: 0.7, height: 0.74 } });
    const chair = item({ kind: 'chair', name: 'Chair', x: 1.3, z: 2, rotationY: 0, size: { width: 0.45, depth: 0.45, height: 0.9 } });

    const seat = seatOf(placeDeskChairs(wrap([desk, chair]), makeRoom()));

    // Centred on the desk's x (the long front side), and out in front of it (+z).
    expect(seat.x).toBeCloseTo(2, 5);
    expect(seat.z).toBeGreaterThan(2.2);
    // Facing the desk: the chair's front points back toward the desk (−z).
    expect(frontDir(seat.rotationY).z).toBeLessThan(-0.9);
  });

  it('places the chair in front of the desk whichever way the desk faces', () => {
    // Desk rotated a quarter turn: front now points along −x.
    const desk = item({ kind: 'desk', name: 'Desk', x: 2, z: 2, rotationY: -Math.PI / 2, size: { width: 1.2, depth: 0.7, height: 0.74 } });
    const chair = item({ kind: 'chair', name: 'Chair', x: 2, z: 1.3, size: { width: 0.45, depth: 0.45, height: 0.9 } });

    const seat = seatOf(placeDeskChairs(wrap([desk, chair]), makeRoom()));

    const fwd = frontDir(desk.rotationY);
    // The chair moved out along the desk's front direction and stayed centred on the other axis.
    expect(Math.sign(seat.x - desk.x)).toBe(Math.sign(fwd.x));
    expect(seat.z).toBeCloseTo(desk.z, 5);
  });

  it('leaves a dining chair (closer to a table than the desk) alone', () => {
    // The chair is within pairing range of the desk (1.5 m) but sits right at the
    // dining table (0.7 m) — it belongs to the table, so it must not be dragged to the desk.
    const desk = item({ kind: 'desk', name: 'Desk', x: 3, z: 0.8, size: { width: 1.2, depth: 0.7, height: 0.74 } });
    const table = item({ kind: 'table', name: 'Table', x: 3, z: 3, size: { width: 1.4, depth: 0.8, height: 0.75 } });
    const chair = item({ kind: 'chair', name: 'Chair', x: 3, z: 2.3, size: { width: 0.45, depth: 0.45, height: 0.9 } });

    const seat = seatOf(placeDeskChairs(wrap([desk, table, chair]), makeRoom()));
    expect(seat.x).toBeCloseTo(3, 5);
    expect(seat.z).toBeCloseTo(2.3, 5);
  });

  it('gives each of two desks its own nearest chair', () => {
    const deskA = item({ kind: 'desk', name: 'Desk A', x: 1, z: 2, size: { width: 1.2, depth: 0.7, height: 0.74 } });
    const deskB = item({ kind: 'desk', name: 'Desk B', x: 3, z: 2, size: { width: 1.2, depth: 0.7, height: 0.74 } });
    const chairA = item({ kind: 'chair', name: 'Chair A', x: 1, z: 2.9, size: { width: 0.45, depth: 0.45, height: 0.9 } });
    const chairB = item({ kind: 'chair', name: 'Chair B', x: 3, z: 2.9, size: { width: 0.45, depth: 0.45, height: 0.9 } });

    const out = placeDeskChairs(wrap([deskA, deskB, chairA, chairB]), makeRoom());
    const chairs = out.proposals[0].furniture.filter((f) => f.kind === 'chair');
    // Each chair stays with the desk it started nearest to (centred on that desk's x).
    expect(chairs.find((c) => c.name === 'Chair A')!.x).toBeCloseTo(1, 5);
    expect(chairs.find((c) => c.name === 'Chair B')!.x).toBeCloseTo(3, 5);
  });

  it('leaves a far-away chair unpaired', () => {
    const desk = item({ kind: 'desk', name: 'Desk', x: 0.7, z: 0.7, size: { width: 1.2, depth: 0.7, height: 0.74 } });
    const chair = item({ kind: 'chair', name: 'Chair', x: 3.5, z: 3.5, size: { width: 0.45, depth: 0.45, height: 0.9 } });
    const seat = seatOf(placeDeskChairs(wrap([desk, chair]), makeRoom()));
    expect(seat.x).toBeCloseTo(3.5, 5);
    expect(seat.z).toBeCloseTo(3.5, 5);
  });
});
