import { Mat, type FurnitureProps } from './shared';

export function Bookshelf({ size, color, selected }: FurnitureProps) {
  const { width: w, depth: d, height: h } = size;
  const t = 0.03;
  const shelves = [0.25, 0.5, 0.75];
  return (
    <group>
      {/* sidor */}
      {[-1, 1].map((s) => (
        <mesh key={s} castShadow position={[s * (w / 2 - t / 2), h / 2, 0]}>
          <boxGeometry args={[t, h, d]} />
          <Mat color={color} selected={selected} />
        </mesh>
      ))}
      {/* topp + botten */}
      <mesh castShadow position={[0, h - t / 2, 0]}>
        <boxGeometry args={[w, t, d]} />
        <Mat color={color} selected={selected} />
      </mesh>
      <mesh castShadow position={[0, 0.025, 0]}>
        <boxGeometry args={[w, 0.05, d]} />
        <Mat color={color} selected={selected} />
      </mesh>
      {/* rygg */}
      <mesh position={[0, h / 2, -d / 2 + 0.01]}>
        <boxGeometry args={[w, h, 0.02]} />
        <Mat color={color} selected={selected} />
      </mesh>
      {/* hyllplan */}
      {shelves.map((f) => (
        <mesh key={f} castShadow position={[0, h * f, 0.01]}>
          <boxGeometry args={[Math.max(w - t * 2, 0.05), 0.025, Math.max(d - 0.04, 0.03)]} />
          <Mat color={color} selected={selected} />
        </mesh>
      ))}
    </group>
  );
}
