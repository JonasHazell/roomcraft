import { describe, expect, it } from 'vitest';
import type { Design, FurnitureItem, FurnitureKind, WallOpening } from '../../types';
import { wallsFromPolygon } from '../polygon';
import { runValidation } from './engine';
import { inferRoomTypes } from './rules';
import { inferZones } from './zones';

/**
 * 4×5 m room with a corner at the origin: north (z=0), east (x=4), south (z=5), west (x=0).
 * Door on the south wall (x 1.6–2.5), window on the north wall (x 1.2–2.6).
 */
function makeDesign(furniture: FurnitureItem[], openings?: Omit<WallOpening, 'id'>[]): Design {
  let n = 0;
  const walls = wallsFromPolygon(
    [
      { x: 0, z: 0 },
      { x: 4, z: 0 },
      { x: 4, z: 5 },
      { x: 0, z: 5 },
    ],
    () => `w${n++}`,
  );
  const south = walls[2];
  const north = walls[0];
  const defaultOpenings: Omit<WallOpening, 'id'>[] = [
    { kind: 'door', wallId: south.id, offset: 1.5, width: 0.9, height: 2.1, elevation: 0 },
    { kind: 'window', wallId: north.id, offset: 1.2, width: 1.4, height: 1.2, elevation: 0.9 },
  ];
  return {
    id: 'r0',
    name: 'Test',
    updatedAt: '2026-01-01T00:00:00.000Z',
    room: { height: 2.5 },
    floorColor: '#c9a878',
    wallColor: '#efe8da',
    floorMaterial: 'matte',
    wallMaterial: 'matte',
    walls,
    openings: (openings ?? defaultOpenings).map((o, i) => ({ ...o, id: `o${i}` })),
    furniture,
    proposals: [
      {
        id: 'p0',
        name: 'Proposal 1',
        furniture,
        floorColor: '#c9a878',
        wallColor: '#efe8da',
        floorMaterial: 'matte',
        wallMaterial: 'matte',
      },
    ],
    activeProposalId: 'p0',
  };
}

let seq = 0;
function piece(
  kind: FurnitureKind,
  x: number,
  z: number,
  opts: Partial<Pick<FurnitureItem, 'rotationY' | 'elevation' | 'name'>> & {
    width?: number;
    depth?: number;
    height?: number;
  } = {},
): FurnitureItem {
  const size = {
    width: opts.width ?? 1,
    depth: opts.depth ?? 1,
    height: opts.height ?? 0.8,
  };
  return {
    id: `f${seq++}`,
    kind,
    name: opts.name ?? kind,
    position: { x, z },
    rotationY: opts.rotationY ?? 0,
    size,
    elevation: opts.elevation ?? 0,
    color: '#888888',
  };
}

function outcomeOf(design: Design, ruleId: string) {
  const report = runValidation(design);
  const result = report.results.find((r) => r.rule.id === ruleId);
  if (!result) throw new Error(`Rule ${ruleId} is missing from the report`);
  return result.outcome;
}

describe('inferRoomTypes', () => {
  it('infers room types from the furniture', () => {
    const d = makeDesign([
      piece('bed', 2, 2, { width: 1.6, depth: 2 }),
      piece('desk', 1, 4, { width: 1.2, depth: 0.7 }),
    ]);
    expect(inferRoomTypes(d)).toEqual(new Set(['sovrum', 'hemmakontor']));
  });

  it('requires both a dining table and a chair for a dining area', () => {
    const table = piece('table', 2, 2, { height: 0.75 });
    expect(inferRoomTypes(makeDesign([table]))).toEqual(new Set());
    expect(inferRoomTypes(makeDesign([table, piece('chair', 2, 3, { width: 0.45, depth: 0.45 })])))
      .toEqual(new Set(['matplats']));
  });

  it('infers a kitchen from any kitchen appliance', () => {
    expect(inferRoomTypes(makeDesign([piece('counter', 2, 2)]))).toEqual(new Set(['kök']));
    expect(inferRoomTypes(makeDesign([piece('stove', 2, 2)]))).toEqual(new Set(['kök']));
    expect(inferRoomTypes(makeDesign([piece('fridge', 2, 2)]))).toEqual(new Set(['kök']));
    expect(
      inferRoomTypes(
        makeDesign([piece('counter', 2, 2), piece('stove', 3, 2), piece('fridge', 4, 2)]),
      ),
    ).toEqual(new Set(['kök']));
  });

  it('infers a bathroom from any bathroom fixture', () => {
    expect(inferRoomTypes(makeDesign([piece('toilet', 2, 2)]))).toEqual(new Set(['badrum']));
    expect(inferRoomTypes(makeDesign([piece('bathtub', 2, 2)]))).toEqual(new Set(['badrum']));
    expect(inferRoomTypes(makeDesign([piece('sink', 2, 2)]))).toEqual(new Set(['badrum']));
  });
});

describe('SAF-02 door swing', () => {
  it('flags a wardrobe in the door swing area', () => {
    const wardrobe = piece('wardrobe', 2, 4.6, { width: 1.2, depth: 0.6, height: 2 });
    const outcome = outcomeOf(makeDesign([wardrobe]), 'SAF-02');
    expect(outcome.status).toBe('violated');
    if (outcome.status === 'violated') {
      expect(outcome.violations[0].furnitureIds).toContain(wardrobe.id);
      expect(outcome.violations[0].zones?.length).toBeGreaterThan(0);
    }
  });

  it('passes furniture placed away from the door', () => {
    const wardrobe = piece('wardrobe', 0.4, 1, { width: 1.2, depth: 0.6, height: 2 });
    expect(outcomeOf(makeDesign([wardrobe]), 'SAF-02').status).toBe('passed');
  });

  it('not applicable without a door', () => {
    const d = makeDesign([piece('sofa', 2, 2)], []);
    expect(outcomeOf(d, 'SAF-02').status).toBe('not-applicable');
  });
});

describe('ERG-08 headboard against a wall', () => {
  it('flags a bed with the headboard under the window', () => {
    // Rotation 0: front (foot end) toward +z, headboard toward the north wall.
    const bed = piece('bed', 1.9, 1, { width: 1.6, depth: 2, height: 0.5 });
    const outcome = outcomeOf(makeDesign([bed]), 'ERG-08');
    expect(outcome.status).toBe('violated');
  });

  it('flags a free-standing bed without wall support', () => {
    const bed = piece('bed', 2, 2.5, { width: 1.6, depth: 2, height: 0.5 });
    expect(outcomeOf(makeDesign([bed]), 'ERG-08').status).toBe('violated');
  });

  it('passes a headboard against a solid wall', () => {
    // Headboard against the east wall (front facing -x).
    const bed = piece('bed', 3, 2.5, {
      width: 1.6,
      depth: 2,
      height: 0.5,
      rotationY: -Math.PI / 2,
    });
    expect(outcomeOf(makeDesign([bed]), 'ERG-08').status).toBe('passed');
  });
});

describe('FEN-02 the coffin position', () => {
  it('flags a bed with the foot end pointing straight at the door', () => {
    // The door is on the south wall around x=2; the foot end (rotation 0) points toward +z.
    const bed = piece('bed', 2, 1.5, { width: 1.6, depth: 2, height: 0.5 });
    expect(outcomeOf(makeDesign([bed]), 'FEN-02').status).toBe('violated');
  });

  it('passes a bed shifted out of the door line', () => {
    const bed = piece('bed', 3.2, 2.5, {
      width: 1.6,
      depth: 2,
      height: 0.5,
      rotationY: -Math.PI / 2,
    });
    expect(outcomeOf(makeDesign([bed]), 'FEN-02').status).toBe('passed');
  });
});

describe('ERG-09 nightstands at bed height', () => {
  // A single bed with a nightstand tucked against its right side at the head end,
  // so the presence check passes and the rule reaches the ±5 cm height comparison.
  const bed = () => piece('bed', 2, 2, { width: 1, depth: 2, height: 0.5 }); // top at 0.5 m
  const nightstand = (topHeight: number) =>
    piece('nightstand', 2.6, 1.4, { width: 0.4, depth: 0.4, height: topHeight });

  it('flags a nightstand 8 cm off the bed top (within the old 10 cm bound, past ±5 cm)', () => {
    const outcome = outcomeOf(makeDesign([bed(), nightstand(0.58)]), 'ERG-09');
    expect(outcome.status).toBe('violated');
    if (outcome.status === 'violated') {
      expect(outcome.violations[0].message).toContain('within ±5 cm');
    }
  });

  it('passes a nightstand 3 cm off the bed top (inside ±5 cm)', () => {
    expect(outcomeOf(makeDesign([bed(), nightstand(0.53)]), 'ERG-09').status).toBe('passed');
  });
});

describe('ACC-13 over-furnishing', () => {
  it('flags a room where furniture covers more than 60% of the floor', () => {
    const boxes = [
      piece('box', 1, 1.2, { width: 1.9, depth: 2.3 }),
      piece('box', 3, 1.2, { width: 1.9, depth: 2.3 }),
      piece('box', 1, 3.6, { width: 1.9, depth: 2.3 }),
      piece('box', 3, 3.6, { width: 1.9, depth: 2.3 }),
    ];
    expect(outcomeOf(makeDesign(boxes), 'ACC-13').status).toBe('violated');
  });

  it('passes an airy room', () => {
    expect(outcomeOf(makeDesign([piece('sofa', 2, 2, { width: 2, depth: 0.9 })]), 'ACC-13').status).toBe(
      'passed',
    );
  });
});

describe('ACC-14 usable clearance in front of a function', () => {
  it('flags a desk whose seating side is blocked by a bed', () => {
    // Desk against the north wall, front (rotation 0) toward +z into the room.
    const desk = piece('desk', 2, 0.4, { width: 1.2, depth: 0.7, height: 0.74 });
    // A wide bed sits right in front of the desk, covering the clearance it needs.
    const bed = piece('bed', 2, 1.85, { width: 1.6, depth: 2, height: 0.5 });
    const outcome = outcomeOf(makeDesign([desk, bed]), 'ACC-14');
    expect(outcome.status).toBe('violated');
    if (outcome.status === 'violated') {
      expect(outcome.violations[0].furnitureIds).toContain(desk.id);
      expect(outcome.violations[0].furnitureIds).toContain(bed.id);
    }
  });

  it('passes a desk with clear space in front', () => {
    const desk = piece('desk', 2, 0.4, { width: 1.2, depth: 0.7, height: 0.74 });
    const bed = piece('bed', 3, 3.5, { width: 1.2, depth: 2, height: 0.5, rotationY: -Math.PI / 2 });
    expect(outcomeOf(makeDesign([desk, bed]), 'ACC-14').status).toBe('passed');
  });

  it('does not flag a sofa for its own coffee table', () => {
    // Sofa against the north wall facing +z, coffee table just in front of it.
    const sofa = piece('sofa', 2, 0.5, { width: 2, depth: 0.9, height: 0.8 });
    const coffee = piece('table', 2, 1.3, { width: 1.1, depth: 0.6, height: 0.4 });
    expect(outcomeOf(makeDesign([sofa, coffee]), 'ACC-14').status).toBe('passed');
  });
});

describe('ACO-03 plants', () => {
  it('flags a room without a plant and passes one with', () => {
    const sofa = piece('sofa', 2, 2, { width: 2, depth: 0.9 });
    expect(outcomeOf(makeDesign([sofa]), 'ACO-03').status).toBe('violated');
    const plant = piece('plant', 0.5, 0.5, { width: 0.4, depth: 0.4, height: 1.2 });
    expect(outcomeOf(makeDesign([sofa, plant]), 'ACO-03').status).toBe('passed');
  });
});

describe('ACC-01 main passages', () => {
  it('flags a room split by a passage narrower than 90 cm', () => {
    // A long box reaching from the west wall leaves only a 0.8 m gap to the east wall.
    const divider = piece('box', 1.5, 2.5, { width: 3.4, depth: 0.4 });
    expect(outcomeOf(makeDesign([divider]), 'ACC-01').status).toBe('violated');
  });

  it('flags two beds that wall off a strip of the room', () => {
    // Two beds side by side span the room and seal the strip between them and
    // the north wall. That cut-off strip is only ~0.6 m² — under the old 0.8 m²
    // threshold, so the rule used to pass it — yet you still cannot pass by the
    // beds to reach it. The barrier furniture is named and highlighted.
    const bedA = piece('bed', 1.2, 2.05, { width: 1.6, depth: 2, height: 0.5, name: 'bed A' });
    const bedB = piece('bed', 2.8, 2.05, { width: 1.6, depth: 2, height: 0.5, name: 'bed B' });
    const outcome = outcomeOf(makeDesign([bedA, bedB]), 'ACC-01');
    expect(outcome.status).toBe('violated');
    if (outcome.status === 'violated') {
      expect(outcome.violations[0].furnitureIds).toContain(bedA.id);
      expect(outcome.violations[0].furnitureIds).toContain(bedB.id);
      expect(outcome.violations[0].zones?.length).toBeGreaterThan(0);
    }
  });

  it('passes an open room', () => {
    const sofa = piece('sofa', 2, 2, { width: 2, depth: 0.9 });
    expect(outcomeOf(makeDesign([sofa]), 'ACC-01').status).toBe('passed');
  });

  it('passes a single bed against the wall', () => {
    const bed = piece('bed', 3, 2.5, { width: 1.2, depth: 2, height: 0.5, rotationY: -Math.PI / 2 });
    expect(outcomeOf(makeDesign([bed]), 'ACC-01').status).toBe('passed');
  });
});

describe('ACC-03 doorway passage width', () => {
  it('flags furniture narrowing the doorway', () => {
    const wardrobe = piece('wardrobe', 2.2, 4.8, { width: 0.6, depth: 0.4, height: 2 });
    const outcome = outcomeOf(makeDesign([wardrobe]), 'ACC-03');
    expect(outcome.status).toBe('violated');
    if (outcome.status === 'violated') {
      expect(outcome.violations[0].furnitureIds).toContain(wardrobe.id);
    }
  });

  it('passes a clear doorway', () => {
    const wardrobe = piece('wardrobe', 0.5, 1, { width: 0.6, depth: 0.4, height: 2 });
    expect(outcomeOf(makeDesign([wardrobe]), 'ACC-03').status).toBe('passed');
  });
});

describe('ERG-03 conversation group', () => {
  it('flags a seat turned away from the group', () => {
    const sofa = piece('sofa', 2, 1, { width: 2, depth: 0.9 });
    const chair = piece('chair', 2, 4.4, { width: 0.6, depth: 0.6, name: 'armchair' });
    expect(outcomeOf(makeDesign([sofa, chair]), 'ERG-03').status).toBe('violated');
  });

  it('passes seats facing each other', () => {
    const sofa = piece('sofa', 2, 1.5, { width: 2, depth: 0.9 });
    const chair = piece('chair', 2, 3, {
      width: 0.6,
      depth: 0.6,
      rotationY: Math.PI,
      name: 'armchair',
    });
    expect(outcomeOf(makeDesign([sofa, chair]), 'ERG-03').status).toBe('passed');
  });
});

describe('ERG-04 surface within reach', () => {
  it('flags a lone seat with no nearby surface', () => {
    const sofa = piece('sofa', 2, 1, { width: 2, depth: 0.9 });
    const chair = piece('chair', 3.5, 4, { width: 0.6, depth: 0.6, name: 'armchair' });
    expect(outcomeOf(makeDesign([sofa, chair]), 'ERG-04').status).toBe('violated');
  });

  it('passes a sofa with a coffee table in front', () => {
    const sofa = piece('sofa', 2, 1, { width: 2, depth: 0.9 });
    const table = piece('table', 2, 2, { width: 1.1, depth: 0.6, height: 0.4 });
    expect(outcomeOf(makeDesign([sofa, table]), 'ERG-04').status).toBe('passed');
  });
});

describe('FEN-14 poison arrows', () => {
  it('flags a sharp corner aimed at the bed', () => {
    const bed = piece('bed', 3, 4, { width: 1.2, depth: 1.4, height: 0.5 });
    const box = piece('box', 1.8, 2.6, { width: 0.8, depth: 0.8, height: 1 });
    expect(outcomeOf(makeDesign([bed, box]), 'FEN-14').status).toBe('violated');
  });

  it('passes when nothing sharp is close', () => {
    const bed = piece('bed', 3, 4, { width: 1.2, depth: 1.4, height: 0.5 });
    const box = piece('box', 0.6, 0.6, { width: 0.8, depth: 0.8, height: 1 });
    expect(outcomeOf(makeDesign([bed, box]), 'FEN-14').status).toBe('passed');
  });
});

describe('SAF-03 escape window reachable', () => {
  // Window on the north wall at x 1.2–2.6 (sill 0.9 m — an escape window).
  it('flags a wardrobe blocking the floor in front of the escape window', () => {
    const bed = piece('bed', 2, 3.5, { width: 1.6, depth: 2, height: 0.5 });
    const wardrobe = piece('wardrobe', 1.9, 0.4, { width: 1.2, depth: 0.6, height: 2 });
    const outcome = outcomeOf(makeDesign([bed, wardrobe]), 'SAF-03');
    expect(outcome.status).toBe('violated');
    if (outcome.status === 'violated') {
      expect(outcome.violations[0].furnitureIds).toContain(wardrobe.id);
    }
  });

  it('passes when the floor in front of the escape window is clear', () => {
    const bed = piece('bed', 2, 3.5, { width: 1.6, depth: 2, height: 0.5 });
    expect(outcomeOf(makeDesign([bed]), 'SAF-03').status).toBe('passed');
  });

  it('is not applicable when the only window sits above the escape sill', () => {
    // A high window (sill 1.5 m > BBR's 1.2 m) does not count as an escape route.
    const north = wallsFromPolygon(
      [
        { x: 0, z: 0 },
        { x: 4, z: 0 },
        { x: 4, z: 5 },
        { x: 0, z: 5 },
      ],
      () => 'w',
    )[0];
    const d = makeDesign(
      [piece('bed', 2, 2.5, { width: 1.6, depth: 2, height: 0.5 })],
      [{ kind: 'window', wallId: north.id, offset: 1.2, width: 1.4, height: 0.6, elevation: 1.5 }],
    );
    expect(outcomeOf(d, 'SAF-03').status).toBe('not-applicable');
  });
});

describe('LGT-05 daylight at the window', () => {
  it('flags a deep wardrobe standing in front of the window', () => {
    // A tall, deep wardrobe by the north window — it shades daylight even though
    // its depth is over 60 cm.
    const wardrobe = piece('wardrobe', 1.9, 0.4, { width: 1.2, depth: 0.65, height: 2 });
    const outcome = outcomeOf(makeDesign([wardrobe]), 'LGT-05');
    expect(outcome.status).toBe('violated');
    if (outcome.status === 'violated') {
      expect(outcome.violations[0].furnitureIds).toContain(wardrobe.id);
    }
  });

  it('passes a low piece in front of the window', () => {
    const bench = piece('box', 1.9, 0.4, { width: 1.2, depth: 0.4, height: 0.5 });
    expect(outcomeOf(makeDesign([bench]), 'LGT-05').status).toBe('passed');
  });
});

describe('LGT-06 screen reflections', () => {
  it('flags a TV facing the window', () => {
    const tv = piece('tv', 1.9, 2, { width: 1.3, depth: 0.35, height: 0.8, rotationY: Math.PI });
    expect(outcomeOf(makeDesign([tv]), 'LGT-06').status).toBe('violated');
  });

  it('passes a TV facing away from the window', () => {
    const tv = piece('tv', 1.9, 2, { width: 1.3, depth: 0.35, height: 0.8 });
    expect(outcomeOf(makeDesign([tv]), 'LGT-06').status).toBe('passed');
  });
});

describe('FEN-26 rugs zone an open-plan room', () => {
  // An open-plan living/dining room: a sofa at one end, a dining set at the other.
  function openPlan(extra: FurnitureItem[] = []): FurnitureItem[] {
    return [
      piece('sofa', 2, 1, { width: 2, depth: 0.9 }),
      piece('table', 2, 4, { width: 1.2, depth: 0.8, height: 0.75 }),
      piece('chair', 2, 3.3, { width: 0.45, depth: 0.45 }),
      ...extra,
    ];
  }

  it('is not applicable to a single-function room', () => {
    // Only a seating group — no dining table, so there is nothing to zone apart.
    const d = makeDesign([piece('sofa', 2, 2, { width: 2, depth: 0.9 })]);
    expect(outcomeOf(d, 'FEN-26').status).toBe('not-applicable');
  });

  it('flags an open-plan room whose zones have no rug', () => {
    const outcome = outcomeOf(makeDesign(openPlan()), 'FEN-26');
    expect(outcome.status).toBe('violated');
    if (outcome.status === 'violated') {
      // Both the seating and the dining anchor are unzoned.
      expect(outcome.violations.length).toBe(2);
    }
  });

  it('passes when each zone sits on its own rug', () => {
    const design = makeDesign(
      openPlan([
        piece('rug', 2, 1.2, { width: 2.4, depth: 1.6, height: 0.02 }),
        piece('rug', 2, 4, { width: 1.8, depth: 1.4, height: 0.02 }),
      ]),
    );
    expect(outcomeOf(design, 'FEN-26').status).toBe('passed');
  });

  it('flags one rug that merges the seating and dining zones', () => {
    const bigRug = piece('rug', 2, 2.5, { width: 3, depth: 4.5, height: 0.02 });
    const outcome = outcomeOf(makeDesign(openPlan([bigRug])), 'FEN-26');
    expect(outcome.status).toBe('violated');
    if (outcome.status === 'violated') {
      expect(outcome.violations.some((v) => v.furnitureIds.includes(bigRug.id))).toBe(true);
    }
  });
});

describe('inferZones', () => {
  it('groups anchors with their satellites and routes chairs by proximity', () => {
    const d = makeDesign([
      piece('bed', 2, 1.4, { width: 1.6, depth: 2, height: 0.5 }),
      piece('nightstand', 3, 0.6, { width: 0.4, depth: 0.4, height: 0.5 }),
      piece('desk', 0.7, 4.3, { width: 1.2, depth: 0.7, height: 0.74 }),
      piece('chair', 0.7, 3.6, { width: 0.5, depth: 0.5 }), // desk chair
    ]);
    const zones = inferZones(d);
    const sleeping = zones.find((z) => z.kind === 'sleeping');
    const work = zones.find((z) => z.kind === 'work');
    expect(sleeping?.members.length).toBe(2); // bed + nightstand
    expect(work?.members.some((m) => m.item.kind === 'chair' && !m.anchor)).toBe(true);
  });

  it('creates no zone for a satellite with no anchor', () => {
    // A nightstand but no bed → nothing to anchor the sleeping zone to.
    const d = makeDesign([piece('nightstand', 2, 2, { width: 0.4, depth: 0.4, height: 0.5 })]);
    expect(inferZones(d)).toEqual([]);
  });
});

describe('ZON-01 zone cohesion', () => {
  it('flags a nightstand stranded far from the bed', () => {
    const bed = piece('bed', 2, 2, { width: 1.6, depth: 2, height: 0.5 });
    const ns = piece('nightstand', 0.5, 4.5, { width: 0.4, depth: 0.4, height: 0.5 });
    const outcome = outcomeOf(makeDesign([bed, ns]), 'ZON-01');
    expect(outcome.status).toBe('violated');
    if (outcome.status === 'violated') {
      expect(outcome.violations[0].furnitureIds).toContain(ns.id);
      expect(outcome.violations[0].furnitureIds).toContain(bed.id);
    }
  });

  it('passes a nightstand tucked against the bed', () => {
    const bed = piece('bed', 2, 2, { width: 1.6, depth: 2, height: 0.5 });
    const ns = piece('nightstand', 3, 1.3, { width: 0.4, depth: 0.4, height: 0.5 });
    expect(outcomeOf(makeDesign([bed, ns]), 'ZON-01').status).toBe('passed');
  });

  it('is not applicable without any zone anchor', () => {
    expect(outcomeOf(makeDesign([piece('plant', 1, 1)]), 'ZON-01').status).toBe('not-applicable');
  });
});

describe('ZON-02 marooned storage', () => {
  it('flags a storage piece stranded in the middle of the room', () => {
    const box = piece('box', 2, 2.5, { width: 0.8, depth: 0.8, height: 1.2 });
    const outcome = outcomeOf(makeDesign([box]), 'ZON-02');
    expect(outcome.status).toBe('violated');
    if (outcome.status === 'violated') {
      expect(outcome.violations[0].furnitureIds).toContain(box.id);
    }
  });

  it('passes a wardrobe against the wall', () => {
    const wardrobe = piece('wardrobe', 2, 0.3, { width: 1.2, depth: 0.6, height: 2 });
    expect(outcomeOf(makeDesign([wardrobe]), 'ZON-02').status).toBe('passed');
  });

  it('passes a bookshelf acting as a divider beside a sofa', () => {
    const sofa = piece('sofa', 2, 1, { width: 2, depth: 0.9, height: 0.8 });
    const shelf = piece('bookshelf', 2, 1.9, { width: 1.5, depth: 0.4, height: 1.8 });
    expect(outcomeOf(makeDesign([sofa, shelf]), 'ZON-02').status).toBe('passed');
  });
});

describe('ZON-03 open floor', () => {
  it('passes an airy room with furniture on the wall', () => {
    const sofa = piece('sofa', 2, 0.5, { width: 2, depth: 0.9, height: 0.8 });
    expect(outcomeOf(makeDesign([sofa]), 'ZON-03').status).toBe('passed');
  });

  it('flags a room whose open floor is crammed and broken into pockets', () => {
    const boxes = [
      piece('box', 1, 1.2, { width: 1.9, depth: 2.3, height: 1 }),
      piece('box', 3, 1.2, { width: 1.9, depth: 2.3, height: 1 }),
      piece('box', 1, 3.6, { width: 1.9, depth: 2.3, height: 1 }),
      piece('box', 3, 3.6, { width: 1.9, depth: 2.3, height: 1 }),
    ];
    expect(outcomeOf(makeDesign(boxes), 'ZON-03').status).toBe('violated');
  });
});

describe('feng shui rules', () => {
  it('always includes the FEN rules in the report', () => {
    const d = makeDesign([piece('bed', 2, 1.5, { width: 1.6, depth: 2 })]);
    const report = runValidation(d);
    expect(report.results.some((r) => r.rule.category === 'Feng shui')).toBe(true);
    expect(report.byCategory.some((c) => c.category === 'Feng shui')).toBe(true);
  });
});

describe('scoring', () => {
  it('gives a total score 0–100 and lowers it on rule violations', () => {
    const tidy = makeDesign([
      piece('bed', 3, 2.5, { width: 1.2, depth: 2, height: 0.5, rotationY: -Math.PI / 2 }),
    ]);
    const messy = makeDesign([
      piece('bed', 2, 1.5, { width: 1.6, depth: 2, height: 0.5 }),
      piece('wardrobe', 2, 4.6, { width: 1.2, depth: 0.6, height: 2 }),
    ]);
    const tidyReport = runValidation(tidy);
    const messyReport = runValidation(messy);
    expect(tidyReport.total).not.toBeNull();
    expect(tidyReport.total!).toBeGreaterThan(messyReport.total!);
    expect(messyReport.total!).toBeGreaterThanOrEqual(0);
    expect(tidyReport.total!).toBeLessThanOrEqual(100);
  });

  it('reports the twin rule in both categories', () => {
    const d = makeDesign([piece('bed', 2, 2.5, { width: 1.6, depth: 2, height: 0.5 })]);
    const report = runValidation(d);
    const erg = report.byCategory.find((c) => c.category === 'Ergonomics & dimensions');
    const fen = report.byCategory.find((c) => c.category === 'Feng shui');
    // ERG-08 (free-standing bed) counts as violated in both categories.
    expect(erg!.violated).toBeGreaterThan(0);
    expect(fen!.violated).toBeGreaterThan(0);
  });
});
