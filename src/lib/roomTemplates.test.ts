import { describe, expect, it } from 'vitest';
import { ROOM_TEMPLATES, templateArea, templatePath } from './roomTemplates';
import { normalizeWinding, validateExteriorLoop, wallsFromPolygon } from './polygon';

let seq = 0;
const nextId = () => `id${seq++}`;

describe('room templates', () => {
  it('offers at least three templates', () => {
    expect(ROOM_TEMPLATES.length).toBeGreaterThanOrEqual(3);
  });

  it('every template is a valid, closed exterior loop', () => {
    for (const t of ROOM_TEMPLATES) {
      const walls = wallsFromPolygon(normalizeWinding(t.points), nextId);
      const check = validateExteriorLoop(walls);
      expect(check, `${t.id} should be a valid loop`).toEqual({ ok: true });
    }
  });

  it('template ids are unique', () => {
    const ids = ROOM_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('reports a positive area', () => {
    expect(templateArea([{ x: 0, z: 0 }, { x: 3, z: 0 }, { x: 3, z: 3 }, { x: 0, z: 3 }])).toBe(
      '≈ 9 m²',
    );
  });

  it('builds a closed svg path', () => {
    const d = templatePath(ROOM_TEMPLATES[0].points);
    expect(d.startsWith('M')).toBe(true);
    expect(d.endsWith('Z')).toBe(true);
  });
});
