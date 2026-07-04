import { Mat, type FurnitureProps } from './shared';

export function Mirror({ size, color, selected }: FurnitureProps) {
  const { width: w, depth: d, height: h } = size;
  const frame = Math.min(0.04, w * 0.08);
  return (
    <group>
      {/* frame */}
      <mesh castShadow position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, d]} />
        <Mat color={color} selected={selected} />
      </mesh>
      {/* glass surface on the front (local +z) */}
      <mesh position={[0, h / 2, d / 2 + 0.003]}>
        <planeGeometry args={[Math.max(w - frame * 2, 0.05), Math.max(h - frame * 2, 0.05)]} />
        <meshStandardMaterial color="#dfe9ee" roughness={0.05} metalness={0.9} />
      </mesh>
    </group>
  );
}
