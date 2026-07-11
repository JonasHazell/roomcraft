import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MATERIAL,
  MATERIALS,
  isMaterialId,
  materialSpec,
  normalizeMaterial,
} from './materials';

describe('materials', () => {
  it('offers at least four selectable finishes including the default', () => {
    expect(MATERIALS.length).toBeGreaterThanOrEqual(4);
    expect(MATERIALS.some((m) => m.id === DEFAULT_MATERIAL)).toBe(true);
  });

  it('includes the patterned stone/tile finishes', () => {
    for (const id of ['concrete', 'tile', 'stone', 'marble']) {
      expect(MATERIALS.some((m) => m.id === id)).toBe(true);
    }
  });

  it('keeps every finish within valid PBR ranges', () => {
    for (const m of MATERIALS) {
      expect(m.roughness).toBeGreaterThanOrEqual(0);
      expect(m.roughness).toBeLessThanOrEqual(1);
      expect(m.metalness).toBeGreaterThanOrEqual(0);
      expect(m.metalness).toBeLessThanOrEqual(1);
    }
  });

  it('resolves known ids and falls back to the default otherwise', () => {
    expect(materialSpec('metal').id).toBe('metal');
    expect(materialSpec(undefined).id).toBe(DEFAULT_MATERIAL);
    expect(materialSpec('nope').id).toBe(DEFAULT_MATERIAL);
  });

  it('normalizes arbitrary input to a valid id', () => {
    expect(normalizeMaterial('wood')).toBe('wood');
    expect(normalizeMaterial('bogus')).toBe(DEFAULT_MATERIAL);
    expect(normalizeMaterial(42)).toBe(DEFAULT_MATERIAL);
    expect(normalizeMaterial(undefined)).toBe(DEFAULT_MATERIAL);
  });

  it('recognizes valid material ids', () => {
    expect(isMaterialId('fabric')).toBe(true);
    expect(isMaterialId('xyz')).toBe(false);
    expect(isMaterialId(null)).toBe(false);
  });
});
