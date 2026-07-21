import { describe, expect, it } from 'vitest';
import { clampToRange } from './fields';

describe('clampToRange — the bound NumberField.commit and CountField enforce (#383)', () => {
  it('passes a value already inside [min, max] through unchanged', () => {
    expect(clampToRange(42, 5, 2000)).toBe(42);
  });

  it('clamps a value below min up to min', () => {
    // e.g. typing "-20" into a furniture Width field declared min={5}.
    expect(clampToRange(-20, 5, 2000)).toBe(5);
  });

  it('clamps a value above max down to max', () => {
    // e.g. typing "9999" into a furniture Width field declared max={2000}.
    expect(clampToRange(9999, 5, 2000)).toBe(2000);
  });

  it('clamps to the exact boundary values', () => {
    expect(clampToRange(5, 5, 2000)).toBe(5);
    expect(clampToRange(2000, 5, 2000)).toBe(2000);
  });
});
