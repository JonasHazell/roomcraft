import { describe, expect, it } from 'vitest';
import type { Design, FurnitureItem, FurnitureKind, WallOpening } from '../../types';
import { SCHEMA_VERSION } from '../../types';
import { wallsFromPolygon } from '../polygon';
import { runValidation } from './engine';
import { inferRoomTypes } from './rules';

/**
 * 4×5 m-rum med hörn i origo: norr (z=0), öster (x=4), söder (z=5), väster (x=0).
 * Dörr på södra väggen (x 1,6–2,5), fönster på norra (x 1,2–2,6).
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
    schemaVersion: SCHEMA_VERSION,
    name: 'Test',
    updatedAt: '2026-01-01T00:00:00.000Z',
    room: { height: 2.5, floorColor: '#c9a878', wallColor: '#efe8da' },
    walls,
    openings: (openings ?? defaultOpenings).map((o, i) => ({ ...o, id: `o${i}` })),
    furniture,
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
  if (!result) throw new Error(`Regeln ${ruleId} saknas i rapporten`);
  return result.outcome;
}

describe('inferRoomTypes', () => {
  it('härleder rumstyper från möblerna', () => {
    const d = makeDesign([
      piece('bed', 2, 2, { width: 1.6, depth: 2 }),
      piece('desk', 1, 4, { width: 1.2, depth: 0.7 }),
    ]);
    expect(inferRoomTypes(d)).toEqual(new Set(['sovrum', 'hemmakontor']));
  });

  it('kräver både matbord och stol för matplats', () => {
    const table = piece('table', 2, 2, { height: 0.75 });
    expect(inferRoomTypes(makeDesign([table]))).toEqual(new Set());
    expect(inferRoomTypes(makeDesign([table, piece('chair', 2, 3, { width: 0.45, depth: 0.45 })])))
      .toEqual(new Set(['matplats']));
  });
});

describe('SAK-02 dörrsvep', () => {
  it('flaggar garderob i dörrens svepyta', () => {
    const wardrobe = piece('wardrobe', 2, 4.6, { width: 1.2, depth: 0.6, height: 2 });
    const outcome = outcomeOf(makeDesign([wardrobe]), 'SAK-02');
    expect(outcome.status).toBe('violated');
    if (outcome.status === 'violated') {
      expect(outcome.violations[0].furnitureIds).toContain(wardrobe.id);
      expect(outcome.violations[0].zones?.length).toBeGreaterThan(0);
    }
  });

  it('godkänner möbel en bit från dörren', () => {
    const wardrobe = piece('wardrobe', 0.4, 1, { width: 1.2, depth: 0.6, height: 2 });
    expect(outcomeOf(makeDesign([wardrobe]), 'SAK-02').status).toBe('passed');
  });

  it('ej tillämplig utan dörr', () => {
    const d = makeDesign([piece('sofa', 2, 2)], []);
    expect(outcomeOf(d, 'SAK-02').status).toBe('not-applicable');
  });
});

describe('ERG-08 huvudgärd mot vägg', () => {
  it('flaggar säng med huvudgärden under fönstret', () => {
    // Rotation 0: framsidan (fotändan) mot +z, huvudgärden mot norra väggen.
    const bed = piece('bed', 1.9, 1, { width: 1.6, depth: 2, height: 0.5 });
    const outcome = outcomeOf(makeDesign([bed]), 'ERG-08');
    expect(outcome.status).toBe('violated');
  });

  it('flaggar fristående säng utan väggstöd', () => {
    const bed = piece('bed', 2, 2.5, { width: 1.6, depth: 2, height: 0.5 });
    expect(outcomeOf(makeDesign([bed]), 'ERG-08').status).toBe('violated');
  });

  it('godkänner huvudgärd mot hel vägg', () => {
    // Huvudgärden mot östra väggen (framsidan pekar mot -x).
    const bed = piece('bed', 3, 2.5, {
      width: 1.6,
      depth: 2,
      height: 0.5,
      rotationY: -Math.PI / 2,
    });
    expect(outcomeOf(makeDesign([bed]), 'ERG-08').status).toBe('passed');
  });
});

describe('FEN-02 kistpositionen', () => {
  it('flaggar säng med fotändan rakt mot dörren', () => {
    // Dörren sitter på södra väggen kring x=2; fotändan (rotation 0) pekar mot +z.
    const bed = piece('bed', 2, 1.5, { width: 1.6, depth: 2, height: 0.5 });
    expect(outcomeOf(makeDesign([bed]), 'FEN-02').status).toBe('violated');
  });

  it('godkänner säng förskjuten ur dörrlinjen', () => {
    const bed = piece('bed', 3.2, 2.5, {
      width: 1.6,
      depth: 2,
      height: 0.5,
      rotationY: -Math.PI / 2,
    });
    expect(outcomeOf(makeDesign([bed]), 'FEN-02').status).toBe('passed');
  });
});

describe('TIL-13 övermöblering', () => {
  it('flaggar rum där möblerna täcker mer än 60 % av golvet', () => {
    const boxes = [
      piece('box', 1, 1.2, { width: 1.9, depth: 2.3 }),
      piece('box', 3, 1.2, { width: 1.9, depth: 2.3 }),
      piece('box', 1, 3.6, { width: 1.9, depth: 2.3 }),
      piece('box', 3, 3.6, { width: 1.9, depth: 2.3 }),
    ];
    expect(outcomeOf(makeDesign(boxes), 'TIL-13').status).toBe('violated');
  });

  it('godkänner luftigt rum', () => {
    expect(outcomeOf(makeDesign([piece('sofa', 2, 2, { width: 2, depth: 0.9 })]), 'TIL-13').status).toBe(
      'passed',
    );
  });
});

describe('AKU-03 växter', () => {
  it('flaggar rum utan växt och godkänner med', () => {
    const sofa = piece('sofa', 2, 2, { width: 2, depth: 0.9 });
    expect(outcomeOf(makeDesign([sofa]), 'AKU-03').status).toBe('violated');
    const plant = piece('plant', 0.5, 0.5, { width: 0.4, depth: 0.4, height: 1.2 });
    expect(outcomeOf(makeDesign([sofa, plant]), 'AKU-03').status).toBe('passed');
  });
});

describe('feng shui-läget', () => {
  it('utesluter FEN-regler när feng shui är avslaget', () => {
    const d = makeDesign([piece('bed', 2, 1.5, { width: 1.6, depth: 2 })]);
    const report = runValidation(d, false);
    expect(report.results.some((r) => r.rule.category === 'Feng shui')).toBe(false);
    expect(report.byCategory.some((c) => c.category === 'Feng shui')).toBe(false);
    // Tvillingregeln ERG-08 finns kvar i sin primärkategori.
    expect(report.results.some((r) => r.rule.id === 'ERG-08')).toBe(true);
  });
});

describe('betyg', () => {
  it('ger totalpoäng 0–100 och sänker betyget vid regelbrott', () => {
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

  it('redovisar tvillingregeln i båda kategorierna', () => {
    const d = makeDesign([piece('bed', 2, 2.5, { width: 1.6, depth: 2, height: 0.5 })]);
    const report = runValidation(d, true);
    const erg = report.byCategory.find((c) => c.category === 'Ergonomi & mått');
    const fen = report.byCategory.find((c) => c.category === 'Feng shui');
    // ERG-08 (fristående säng) räknas som bruten i båda kategorierna.
    expect(erg!.violated).toBeGreaterThan(0);
    expect(fen!.violated).toBeGreaterThan(0);
  });
});
