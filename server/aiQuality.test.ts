import { describe, expect, it } from 'vitest';
import type { Design, Wall } from '../src/types.ts';
import { autoFixProposals } from './autofix.ts';
import { buildRepairPrompt } from './prompt.ts';
import {
  blockingCount,
  collectFindings,
  isBetter,
  repairFindings,
  scoreProposals,
} from './ruleValidation.ts';
import type { ResolvedFurniture, ResolvedProposals } from './schema.ts';

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
    id: 'r0',
    name: 'test',
    updatedAt: '',
    room: { height: 2.4 },
    floorColor: '#ffffff',
    wallColor: '#ffffff',
    floorMaterial: 'matte',
    wallMaterial: 'matte',
    walls,
    openings: [
      { id: 'd0', kind: 'door', wallId: 'w0', offset: 1.5, width: 1.0, height: 2.0, elevation: 0 },
    ],
    furniture: [],
    proposals: [],
    activeProposalId: 'p0',
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
  color: '#000000',
  reasoning: '',
  ...over,
});

const proposal = (furniture: ResolvedFurniture[]): ResolvedProposals => ({
  proposals: [{ title: 't', concept: 'c', floorColor: '#fff', wallColor: '#fff', furniture }],
});

describe('collectFindings', () => {
  it('flags an out-of-bounds piece as a blocking mechanical finding', () => {
    const design = makeRoom();
    const data = proposal([box({ name: 'Sticking out', x: 3.9 })]);
    const findings = collectFindings(data, design);
    const out = findings.find((f) => f.message.includes('Sticking out'));
    expect(out).toBeDefined();
    expect(out?.blocking).toBe(true);
    expect(out?.importance).toBe(5);
  });

  it('tags every finding with the rule importance and sorts most-important first', () => {
    const design = makeRoom();
    const data = proposal([box({ name: 'A', x: 2 }), box({ name: 'B', x: 2.5 })]);
    const findings = collectFindings(data, design);
    expect(findings.length).toBeGreaterThan(0);
    for (const f of findings) expect(f.importance).toBeGreaterThanOrEqual(1);
    for (let i = 1; i < findings.length; i++) {
      expect(findings[i - 1].importance).toBeGreaterThanOrEqual(findings[i].importance);
    }
  });
});

describe('scoreProposals', () => {
  it('reports blocking findings and a 0–100 quality for an out-of-bounds piece', () => {
    const design = makeRoom();
    const score = scoreProposals(proposal([box({ name: 'Sticking out', x: 3.9 })]), design);
    expect(score.blocking).toBeGreaterThan(0);
    expect(score.quality).toBeGreaterThanOrEqual(0);
    expect(score.quality).toBeLessThanOrEqual(100);
    // The findings match what collectFindings returns on its own.
    expect(score.findings).toEqual(collectFindings(proposal([box({ name: 'Sticking out', x: 3.9 })]), design));
  });

  it('reports no blocking findings for a single in-bounds piece', () => {
    const design = makeRoom();
    const score = scoreProposals(proposal([box({ kind: 'table', name: 'Table', z: 2 })]), design);
    expect(score.blocking).toBe(0);
  });
});

describe('isBetter', () => {
  const score = (blocking: number, quality: number) => ({ findings: [], blocking, quality });

  it('prefers fewer blocking findings even when quality is lower', () => {
    expect(isBetter(score(0, 40), score(1, 100))).toBe(true);
    expect(isBetter(score(1, 100), score(0, 40))).toBe(false);
  });

  it('breaks a blocking tie on the higher quality score', () => {
    expect(isBetter(score(0, 80), score(0, 60))).toBe(true);
    expect(isBetter(score(0, 60), score(0, 80))).toBe(false);
  });

  it('does not count an identical score as better (an unchanged round never wins)', () => {
    expect(isBetter(score(0, 70), score(0, 70))).toBe(false);
  });
});

describe('autoFixProposals', () => {
  it('pulls an out-of-bounds piece back inside the room', () => {
    const design = makeRoom();
    const data = proposal([box({ name: 'Sticking out', x: 3.9 })]);
    expect(blockingCount(collectFindings(data, design))).toBeGreaterThan(0);
    const fixed = autoFixProposals(data, design);
    expect(blockingCount(collectFindings(fixed, design))).toBe(0);
  });

  it('separates two overlapping pieces', () => {
    const design = makeRoom();
    const data = proposal([box({ name: 'A', x: 2 }), box({ name: 'B', x: 2.5 })]);
    const fixed = autoFixProposals(data, design);
    // No mechanical overlap/bounds finding should remain.
    const remaining = collectFindings(fixed, design).filter(
      (f) => f.message.includes('overlap') || f.message.includes('outside the room'),
    );
    expect(remaining).toHaveLength(0);
  });

  it('leaves a rug lying under other furniture untouched', () => {
    const design = makeRoom();
    const data = proposal([
      box({ kind: 'rug', name: 'Rug', x: 2, z: 2, size: { width: 2, depth: 2, height: 0.02 } }),
      box({ kind: 'table', name: 'Table', x: 2, z: 2, size: { width: 1, depth: 0.8, height: 0.75 } }),
    ]);
    const fixed = autoFixProposals(data, design);
    const rug = fixed.proposals[0].furniture.find((f) => f.kind === 'rug');
    expect(rug?.x).toBe(2);
    expect(rug?.z).toBe(2);
  });
});

describe('buildRepairPrompt', () => {
  it('separates hard requirements from optional improvements', () => {
    const text = buildRepairPrompt([
      { message: 'must A', blocking: true },
      { message: 'should B', blocking: false },
    ]);
    expect(text).toContain('MUST fix');
    expect(text).toContain('must A');
    expect(text).toContain('SHOULD improve');
    expect(text).toContain('should B');
  });

  it('omits the SHOULD section when there is nothing optional', () => {
    const text = buildRepairPrompt([{ message: 'must A', blocking: true }]);
    expect(text).toContain('MUST fix');
    expect(text).not.toContain('SHOULD improve');
  });
});

describe('repairFindings', () => {
  it('keeps importance ≥ 3 and drops cosmetic remarks', () => {
    const findings = [
      { proposalTitle: '', message: 'block', importance: 5, blocking: true },
      { proposalTitle: '', message: 'ergo', importance: 3, blocking: false },
      { proposalTitle: '', message: 'cosmetic', importance: 2, blocking: false },
    ];
    const kept = repairFindings(findings).map((f) => f.message);
    expect(kept).toContain('block');
    expect(kept).toContain('ergo');
    expect(kept).not.toContain('cosmetic');
  });
});
