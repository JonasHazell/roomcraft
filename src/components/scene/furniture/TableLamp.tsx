import { Mat, type FurnitureProps } from './shared';

/**
 * A small table lamp: a round base, a short pole and a tapered shade — the same
 * shape as {@link FloorLamp} at table-top scale. Purely geometric — no
 * emissive/light-source behaviour, matching every other procedural piece here.
 */
export function TableLamp({ size, color, selected }: FurnitureProps) {
  const { width: w, depth: d, height: h } = size;
  const r = Math.min(w, d) / 2;
  const baseH = Math.min(0.02, h * 0.08);
  const poleH = h * 0.4;
  const shadeH = Math.max(h - baseH - poleH, 0.08);
  const poleR = Math.max(r * 0.18, 0.01);

  return (
    <group>
      {/* round base */}
      <mesh castShadow position={[0, baseH / 2, 0]}>
        <cylinderGeometry args={[r * 0.85, r, baseH, 16]} />
        <Mat color={color} selected={selected} part="base" />
      </mesh>
      {/* pole */}
      <mesh castShadow position={[0, baseH + poleH / 2, 0]}>
        <cylinderGeometry args={[poleR, poleR, poleH, 10]} />
        <Mat color={color} selected={selected} part="base" />
      </mesh>
      {/* tapered shade on top, open-ended */}
      <mesh castShadow position={[0, baseH + poleH + shadeH / 2, 0]}>
        <cylinderGeometry args={[r * 0.55, r * 0.95, shadeH, 16, 1, true]} />
        <Mat color={color} selected={selected} part="shade" />
      </mesh>
    </group>
  );
}
