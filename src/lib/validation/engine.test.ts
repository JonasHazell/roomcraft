import { describe, expect, it } from 'vitest';
import type { Design, FurnitureItem, FurnitureKind, WallOpening } from '../../types';
import { wallsFromPolygon } from '../polygon';
import { runValidation } from './engine';
import { inferRoomTypes } from './rules';

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
    walls,
    openings: (openings ?? defaultOpenings).map((o, i) => ({ ...o, id: `o${i}` })),
    furniture,
    proposals: [
      { id: 'p0', name: 'Proposal 1', furniture, floorColor: '#c9a878', wallColor: '#efe8da' },
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

function outcomeOf(design: Design, ruleId: string, fengShui = true) {
  const report = runValidation(design, fengShui);
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

  it('passes an open room', () => {
    const sofa = piece('sofa', 2, 2, { width: 2, depth: 0.9 });
    expect(outcomeOf(makeDesign([sofa]), 'ACC-01').status).toBe('passed');
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

describe('feng shui mode', () => {
  it('excludes FEN rules when feng shui is disabled', () => {
    const d = makeDesign([piece('bed', 2, 1.5, { width: 1.6, depth: 2 })]);
    const report = runValidation(d, false);
    expect(report.results.some((r) => r.rule.category === 'Feng shui')).toBe(false);
    expect(report.byCategory.some((c) => c.category === 'Feng shui')).toBe(false);
    // The twin rule ERG-08 remains in its primary category.
    expect(report.results.some((r) => r.rule.id === 'ERG-08')).toBe(true);
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
    const tidyReport = runValidation(tidy, true);
    const messyReport = runValidation(messy, true);
    expect(tidyReport.total).not.toBeNull();
    expect(tidyReport.total!).toBeGreaterThan(messyReport.total!);
    expect(messyReport.total!).toBeGreaterThanOrEqual(0);
    expect(tidyReport.total!).toBeLessThanOrEqual(100);
  });

  it('reports the twin rule in both categories', () => {
    const d = makeDesign([piece('bed', 2, 2.5, { width: 1.6, depth: 2, height: 0.5 })]);
    const report = runValidation(d, true);
    const erg = report.byCategory.find((c) => c.category === 'Ergonomics & dimensions');
    const fen = report.byCategory.find((c) => c.category === 'Feng shui');
    // ERG-08 (free-standing bed) counts as violated in both categories.
    expect(erg!.violated).toBeGreaterThan(0);
    expect(fen!.violated).toBeGreaterThan(0);
  });
});
