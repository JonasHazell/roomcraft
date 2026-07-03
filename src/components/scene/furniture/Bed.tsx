import { Mat, shade, type FurnitureProps } from './shared';

export function Bed({ size, color, selected }: FurnitureProps) {
  const { width: w, depth: d, height: h } = size;
  return (
    <group>
      <mesh castShadow position={[0, h * 0.275, 0]}>
        <boxGeometry args={[w, h * 0.55, d]} />
        <Mat color={color} selected={selected} />
      </mesh>
      <mesh castShadow position={[0, h * 0.775, 0]}>
        <boxGeometry args={[Math.max(w - 0.12, 0.05), h * 0.45, Math.max(d - 0.12, 0.05)]} />
        <Mat color={shade(color, 0.4)} selected={selected} />
      </mesh>
      <mesh castShadow position={[0, h + 0.04, -d / 2 + 0.28]}>
        <boxGeometry args={[w * 0.5, 0.09, 0.32]} />
        <Mat color={shade(color, 0.75)} selected={selected} />
      </mesh>
    </group>
  );
}
