import { Mat, shade, type FurnitureProps } from './shared';

export function Wardrobe({ size, color, selected }: FurnitureProps) {
  const { width: w, depth: d, height: h } = size;
  return (
    <group>
      <mesh castShadow position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, d]} />
        <Mat color={color} selected={selected} />
      </mesh>
      {/* dörrpanel-antydan: två fronter med springa i mitten */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (w / 4 + 0.005), h / 2, d / 2 + 0.005]}>
          <boxGeometry args={[Math.max(w / 2 - 0.03, 0.05), Math.max(h - 0.08, 0.1), 0.015]} />
          <Mat color={shade(color, 0.12)} selected={selected} />
        </mesh>
      ))}
      {/* handtag */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.06, h * 0.52, d / 2 + 0.025]}>
          <boxGeometry args={[0.025, 0.22, 0.025]} />
          <Mat color="#5c5648" selected={selected} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}
