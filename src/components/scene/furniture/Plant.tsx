import { Mat, shade, type FurnitureProps } from './shared';

export function Plant({ size, color, selected }: FurnitureProps) {
  const { width: w, depth: d, height: h } = size;
  const r = Math.min(w, d) / 2;
  const potH = Math.min(0.35, h * 0.3);
  const foliageH = h - potH;
  return (
    <group>
      {/* pot */}
      <mesh castShadow position={[0, potH / 2, 0]}>
        <cylinderGeometry args={[r * 0.7, r * 0.55, potH, 16]} />
        <Mat color="#a5623f" selected={selected} />
      </mesh>
      {/* trunk */}
      <mesh castShadow position={[0, potH + foliageH * 0.25, 0]}>
        <cylinderGeometry args={[0.02, 0.03, foliageH * 0.5, 8]} />
        <Mat color={shade('#6b4a2e', 0.1)} selected={selected} />
      </mesh>
      {/* foliage */}
      <mesh castShadow position={[0, potH + foliageH * 0.65, 0]}>
        <sphereGeometry args={[r, 16, 12]} />
        <Mat color={color} selected={selected} />
      </mesh>
      <mesh castShadow position={[r * 0.4, potH + foliageH * 0.85, r * 0.2]}>
        <sphereGeometry args={[r * 0.6, 12, 10]} />
        <Mat color={shade(color, 0.15)} selected={selected} />
      </mesh>
    </group>
  );
}
