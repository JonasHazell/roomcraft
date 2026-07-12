import { optNum } from '../../../lib/furnitureOptions';
import { materialSpec } from '../../../lib/materials';
import { Mat, MaterialContext, shade, type FurnitureProps } from './shared';

// The foliage/trunk always render as soft matte greenery, independent of the pot.
const FOLIAGE = materialSpec('matte');

// Extra foliage clusters beyond the main sphere: offset position (× r) and radius (× r).
const EXTRA_CLUSTERS = [
  { x: 0.4, y: 0.85, z: 0.2, r: 0.6 },
  { x: -0.45, y: 0.78, z: -0.15, r: 0.55 },
];

export function Plant({ size, color, selected, options }: FurnitureProps) {
  const { width: w, depth: d, height: h } = size;
  const r = Math.min(w, d) / 2;
  const potH = Math.min(0.35, h * 0.3);
  const foliageH = h - potH;
  const clusters = optNum(options, 'clusters', 2);

  return (
    <group>
      {/* pot */}
      <mesh castShadow position={[0, potH / 2, 0]}>
        <cylinderGeometry args={[r * 0.7, r * 0.55, potH, 16]} />
        <Mat color="#a5623f" selected={selected} part="pot" />
      </mesh>
      <MaterialContext.Provider value={FOLIAGE}>
        {/* trunk */}
        <mesh castShadow position={[0, potH + foliageH * 0.25, 0]}>
          <cylinderGeometry args={[0.02, 0.03, foliageH * 0.5, 8]} />
          <Mat color={shade('#6b4a2e', 0.1)} selected={selected} />
        </mesh>
        {/* main foliage */}
        <mesh castShadow position={[0, potH + foliageH * 0.65, 0]}>
          <sphereGeometry args={[r, 16, 12]} />
          <Mat color={color} selected={selected} />
        </mesh>
        {/* extra foliage clusters */}
        {EXTRA_CLUSTERS.slice(0, Math.max(0, clusters - 1)).map((c, i) => (
          <mesh key={i} castShadow position={[r * c.x, potH + foliageH * c.y, r * c.z]}>
            <sphereGeometry args={[r * c.r, 12, 10]} />
            <Mat color={shade(color, 0.15)} selected={selected} />
          </mesh>
        ))}
      </MaterialContext.Provider>
    </group>
  );
}
