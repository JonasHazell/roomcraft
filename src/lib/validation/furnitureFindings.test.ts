import { describe, expect, it } from 'vitest';
import { findingsForFurniture } from './furnitureFindings';
import type { ValidationReport } from './engine';
import type { RuleDef } from './rules';

// Minimal RuleDef stub — findingsForFurniture only reads `id` and `importance`.
const rule = (id: string, importance: 1 | 2 | 3 | 4 | 5): RuleDef => ({
  id,
  title: id,
  category: 'Safety',
  importance,
  source: 'test',
  check: () => ({ status: 'passed' }),
});

function reportWith(results: ValidationReport['results']): ValidationReport {
  return {
    designUpdatedAt: '2026-01-01T00:00:00.000Z',
    roomTypes: [],
    results,
    total: 0,
    byCategory: [],
  };
}

describe('findingsForFurniture', () => {
  it('returns findings whose furnitureIds include the piece', () => {
    const report = reportWith([
      {
        rule: rule('SAF-01', 5),
        outcome: {
          status: 'violated',
          violations: [{ message: 'blocks the door', furnitureIds: ['a'] }],
        },
      },
    ]);

    const found = findingsForFurniture(report, 'a');
    expect(found).toHaveLength(1);
    expect(found[0].message).toBe('blocks the door');
    expect(found[0].importance).toBe(5);
    expect(found[0].key).toBe('SAF-01:0');
  });

  it('excludes findings that do not reference the piece', () => {
    const report = reportWith([
      {
        rule: rule('SAF-01', 5),
        outcome: {
          status: 'violated',
          violations: [{ message: 'about b', furnitureIds: ['b'] }],
        },
      },
      { rule: rule('SAF-02', 4), outcome: { status: 'passed' } },
      { rule: rule('SAF-03', 4), outcome: { status: 'not-applicable' } },
    ]);

    // Piece 'a' is referenced by nothing (violation names 'b', others passed/na).
    expect(findingsForFurniture(report, 'a')).toEqual([]);
    // Piece 'b' is referenced by the one violation.
    expect(findingsForFurniture(report, 'b')).toHaveLength(1);
  });

  it('keeps a multi-piece finding for each piece it names', () => {
    const report = reportWith([
      {
        rule: rule('LAY-01', 3),
        outcome: {
          status: 'violated',
          violations: [{ message: 'a and b clash', furnitureIds: ['a', 'b'] }],
        },
      },
    ]);

    expect(findingsForFurniture(report, 'a')).toHaveLength(1);
    expect(findingsForFurniture(report, 'b')).toHaveLength(1);
    expect(findingsForFurniture(report, 'c')).toEqual([]);
  });

  it('sorts a piece’s findings by importance, worst first', () => {
    const report = reportWith([
      {
        rule: rule('ERG-08', 3),
        outcome: {
          status: 'violated',
          violations: [{ message: 'mild', furnitureIds: ['a'] }],
        },
      },
      {
        rule: rule('SAF-02', 5),
        outcome: {
          status: 'violated',
          violations: [{ message: 'severe', furnitureIds: ['a'] }],
        },
      },
    ]);

    expect(findingsForFurniture(report, 'a').map((f) => f.importance)).toEqual([5, 3]);
  });

  it('returns nothing when there is no report yet', () => {
    expect(findingsForFurniture(null, 'a')).toEqual([]);
  });
});
