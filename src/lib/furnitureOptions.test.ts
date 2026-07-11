import { describe, expect, it } from 'vitest';
import {
  FURNITURE_OPTIONS,
  defaultOptions,
  hasOptions,
  normalizeOptions,
  optBool,
  optNum,
  optStr,
} from './furnitureOptions';
import { FURNITURE_KINDS } from './furnitureCatalog';

describe('furniture option specs', () => {
  it('declares an entry for every furniture kind', () => {
    for (const kind of FURNITURE_KINDS) {
      expect(FURNITURE_OPTIONS[kind]).toBeDefined();
    }
  });

  it('gives count/select defaults that are within range / a valid choice', () => {
    for (const kind of FURNITURE_KINDS) {
      for (const spec of FURNITURE_OPTIONS[kind]) {
        if (spec.type === 'count') {
          expect(spec.default).toBeGreaterThanOrEqual(spec.min);
          expect(spec.default).toBeLessThanOrEqual(spec.max);
        } else if (spec.type === 'select') {
          expect(spec.choices.map((c) => c.value)).toContain(spec.default);
        }
      }
    }
  });
});

describe('defaultOptions', () => {
  it('builds an object from the specs at their defaults', () => {
    expect(defaultOptions('bed')).toEqual({ mattresses: 1 });
    expect(defaultOptions('bookshelf')).toEqual({ shelves: 4, doors: false });
  });

  it('is empty for a kind without options', () => {
    expect(defaultOptions('box')).toEqual({});
    expect(hasOptions('box')).toBe(false);
    expect(hasOptions('bookshelf')).toBe(true);
  });
});

describe('normalizeOptions', () => {
  it('fills missing keys with defaults and drops unknown keys', () => {
    expect(normalizeOptions('bookshelf', { shelves: 6, junk: 'nope' })).toEqual({
      shelves: 6,
      doors: false,
    });
  });

  it('clamps and rounds out-of-range counts', () => {
    expect(normalizeOptions('bookshelf', { shelves: 99 }).shelves).toBe(6);
    expect(normalizeOptions('bookshelf', { shelves: 0 }).shelves).toBe(1);
    expect(normalizeOptions('bed', { mattresses: 2.7 }).mattresses).toBe(2);
  });

  it('falls back on wrong-typed values and invalid choices', () => {
    expect(normalizeOptions('bookshelf', { doors: 'yes' }).doors).toBe(false);
    expect(normalizeOptions('rug', { pattern: 'polka' }).pattern).toBe('solid');
    expect(normalizeOptions('rug', { pattern: 'striped' }).pattern).toBe('striped');
  });

  it('accepts undefined/garbage input', () => {
    expect(normalizeOptions('desk', undefined)).toEqual({ monitors: 1, drawers: true });
    expect(normalizeOptions('desk', 42)).toEqual({ monitors: 1, drawers: true });
  });

  it('is idempotent', () => {
    const once = normalizeOptions('wardrobe', { doors: 3, legs: true });
    expect(normalizeOptions('wardrobe', once)).toEqual(once);
  });
});

describe('read helpers', () => {
  it('return the stored value or the fallback', () => {
    const o = { shelves: 5, doors: true, pattern: 'border' };
    expect(optNum(o, 'shelves', 4)).toBe(5);
    expect(optNum(o, 'missing', 4)).toBe(4);
    expect(optBool(o, 'doors', false)).toBe(true);
    expect(optBool(o, 'missing', false)).toBe(false);
    expect(optStr(o, 'pattern', 'solid')).toBe('border');
    expect(optStr(o, 'missing', 'solid')).toBe('solid');
    expect(optNum(undefined, 'shelves', 4)).toBe(4);
  });
});
