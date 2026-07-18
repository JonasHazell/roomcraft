import { describe, expect, it } from 'vitest';
import type { Design, Wall } from '../src/types.ts';
import { buildUserPrompt, SYSTEM_PROMPT } from './prompt.ts';

/** Minimal 4×4 m room with a door and a low-sill window. */
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
      { id: 'win0', kind: 'window', wallId: 'w2', offset: 1.0, width: 1.2, height: 1.2, elevation: 0.9 },
    ],
    furniture: [],
    proposals: [],
    activeProposalId: '',
  };
}

describe('buildUserPrompt catalog serialization', () => {
  const prompt = buildUserPrompt(makeRoom(), 'a bed and a wardrobe');
  const catalog = JSON.parse(prompt.slice(prompt.indexOf('[', prompt.indexOf('## Furniture catalog'))).split('\n\n')[0]) as Array<{
    kind: string;
    blockerar_passage: boolean;
  }>;

  it('emits the obstacle flag the passage/reachability checks use', () => {
    expect(prompt).toContain('blockerar_passage');
  });

  it('marks solid pieces as blockers and rugs/chairs as non-blockers', () => {
    const byKind = Object.fromEntries(catalog.map((e) => [e.kind, e.blockerar_passage]));
    expect(byKind.wardrobe).toBe(true);
    expect(byKind.bed).toBe(true);
    expect(byKind.sofa).toBe(true);
    expect(byKind.rug).toBe(false);
    expect(byKind.chair).toBe(false);
  });
});

describe('SYSTEM_PROMPT window rule', () => {
  it('describes the escape-route and ventilation constraints, not a height threshold', () => {
    // Grounded in SAF-03 (escape window, sill ≤ 1.2 m, 0.6 m clearance) and
    // ACC-11 (ventilation, furniture depth > 0.6 m flush against the window).
    expect(SYSTEM_PROMPT).toContain('escape route');
    expect(SYSTEM_PROMPT).toContain('ventilation');
    expect(SYSTEM_PROMPT).toContain('underkant_m');
    expect(SYSTEM_PROMPT).not.toContain('taller than 1.2 m');
  });
});
