import { describe, expect, it } from 'vitest';
import {
  FURNITURE_PARTS,
  defaultMaterials,
  hasParts,
  normalizeMaterials,
  partMaterial,
  primaryPart,
} from './furnitureParts';

describe('furniture parts', () => {
  it('gives every kind at least one part with a valid default material', () => {
    for (const parts of Object.values(FURNITURE_PARTS)) {
      expect(parts.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('reports multi-part kinds and picks a primary part', () => {
    expect(hasParts('bed')).toBe(true);
    expect(hasParts('box')).toBe(false);
    expect(primaryPart('bed')).toBe('frame');
  });

  it('defaults a bed to a wood frame and fabric bedding', () => {
    expect(defaultMaterials('bed')).toEqual({ frame: 'wood', bedding: 'fabric' });
  });

  it('falls back to the part default for an un-set piece', () => {
    expect(normalizeMaterials('bed', undefined, undefined)).toEqual({
      frame: 'wood',
      bedding: 'fabric',
    });
  });

  it('treats a legacy non-matte whole-piece choice as uniform', () => {
    expect(normalizeMaterials('bed', undefined, 'metal')).toEqual({
      frame: 'metal',
      bedding: 'metal',
    });
  });

  it('treats the legacy default matte as unset, so parts keep their nicer defaults', () => {
    expect(normalizeMaterials('bed', undefined, 'matte')).toEqual({
      frame: 'wood',
      bedding: 'fabric',
    });
  });

  it('merges a partial per-part map onto the defaults and drops unknown parts', () => {
    expect(normalizeMaterials('bed', { frame: 'metal', bogus: 'tile' })).toEqual({
      frame: 'metal',
      bedding: 'fabric',
    });
  });

  it('normalizes unknown material ids to the default finish', () => {
    expect(normalizeMaterials('bed', { frame: 'unobtanium' }).frame).toBe('matte');
  });

  it('resolves a single part, falling back to its default', () => {
    expect(partMaterial('table', { top: 'marble' }, 'top')).toBe('marble');
    expect(partMaterial('table', {}, 'legs')).toBe('wood');
    expect(partMaterial('table', undefined, 'top')).toBe('wood');
  });
});
