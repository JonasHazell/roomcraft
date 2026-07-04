import { Mat, shade, type FurnitureProps } from './shared';

export function Tv({ size, color, selected }: FurnitureProps) {
  const { width: w, depth: d, height: h } = size;
  const benchH = Math.min(0.35, h * 0.45);
  const screenH = Math.max(h - benchH - 0.08, 0.2);
  const screenW = w * 0.92;
  return (
    <group>
      {/* media bench */}
      <mesh castShadow position={[0, benchH / 2, 0]}>
        <boxGeometry args={[w, benchH, d]} />
        <Mat color={shade(color, 0.35)} selected={selected} />
      </mesh>
      {/* screen toward the back, picture side facing local +z */}
      <mesh castShadow position={[0, benchH + 0.08 + screenH / 2, -d / 2 + 0.08]}>
        <boxGeometry args={[screenW, screenH, 0.04]} />
        <Mat color={color} selected={selected} roughness={0.3} />
      </mesh>
      <mesh position={[0, benchH + 0.08 + screenH / 2, -d / 2 + 0.105]}>
        <planeGeometry args={[screenW * 0.94, screenH * 0.88]} />
        <meshStandardMaterial color="#10151c" roughness={0.15} metalness={0.4} />
      </mesh>
      {/* stand */}
      <mesh castShadow position={[0, benchH + 0.04, -d / 2 + 0.08]}>
        <boxGeometry args={[screenW * 0.3, 0.08, 0.1]} />
        <Mat color={color} selected={selected} />
      </mesh>
    </group>
  );
}
