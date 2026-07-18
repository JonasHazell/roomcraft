import { describe, expect, it } from 'vitest';
import { nearestPieceDistance } from './furnitureDistance';

function item(x: number, z: number, width = 1, depth = 1, rotationY = 0) {
  return { position: { x, z }, rotationY, size: { width, depth, height: 1 } };
}

describe('nearestPieceDistance', () => {
  it('is null when there is no other piece', () => {
    expect(nearestPieceDistance(item(2, 2.5), [])).toBeNull();
  });

  it('measures the gap to a nearby piece', () => {
    // Two 1×1 pieces 2 m apart center-to-center → 1 m edge-to-edge gap.
    const other = item(2, 4.5);
    expect(nearestPieceDistance(item(2, 2.5), [other])).toBeCloseTo(1, 2);
  });

  it('is ~0 when pieces are touching', () => {
    const other = item(2, 3.5); // 1 m apart center-to-center, edges touching.
    expect(nearestPieceDistance(item(2, 2.5), [other])).toBeCloseTo(0, 2);
  });

  it('picks the closer of two other pieces', () => {
    const near = item(2, 3.6); // ~0.1 m gap
    const far = item(2, 4.6); // ~1.1 m gap
    expect(nearestPieceDistance(item(2, 2.5), [far, near])).toBeCloseTo(0.1, 2);
  });
});
