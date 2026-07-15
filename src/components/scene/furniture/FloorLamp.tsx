import { Mat, type FurnitureProps } from './shared';

/**
 * A slender floor-standing lamp: a wide flat base, a thin pole and a tapered
 * shade on top. Purely geometric — no emissive/light-source behaviour, matching
 * every other procedural piece in this folder.
 */
export function FloorLamp({ size, color, selected }: FurnitureProps) {
  const { width: w, depth: d, height: h } = size;
  const r = Math.min(w, d) / 2;
  const baseH = Math.min(0.04, h * 0.05);
  const poleH = h * 0.72;
  const shadeH = Math.max(h - baseH - poleH, 0.1);
  const poleR = Math.max(r * 0.08, 0.015);

  return (
    <group>
      {/* wide flat base the pole stands on */}
      <mesh castShadow position={[0, baseH / 2, 0]}>
        <cylinderGeometry args={[r * 0.9, r, baseH, 20]} />
        <Mat color={color} selected={selected} part="base" />
      </mesh>
      {/* pole */}
      <mesh castShadow position={[0, baseH + poleH / 2, 0]}>
        <cylinderGeometry args={[poleR, poleR, poleH, 12]} />
        <Mat color={color} selected={selected} part="base" />
      </mesh>
      {/* tapered shade on top, open-ended */}
      <mesh castShadow position={[0, baseH + poleH + shadeH / 2, 0]}>
        <cylinderGeometry args={[r * 0.5, r * 0.85, shadeH, 20, 1, true]} />
        <Mat color={color} selected={selected} part="shade" />
      </mesh>
    </group>
  );
}
