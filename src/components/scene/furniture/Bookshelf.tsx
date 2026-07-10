import { optBool, optNum } from '../../../lib/furnitureOptions';
import { Mat, shade, type FurnitureProps } from './shared';

export function Bookshelf({ size, color, selected, options }: FurnitureProps) {
  const { width: w, depth: d, height: h } = size;
  const t = 0.03;
  const shelfCount = optNum(options, 'shelves', 4);
  const doors = optBool(options, 'doors', false);
  // Interior shelves spread evenly between the bottom and top panels.
  const shelves = Array.from({ length: shelfCount }, (_, i) => (i + 1) / (shelfCount + 1));

  return (
    <group>
      {/* sides */}
      {[-1, 1].map((s) => (
        <mesh key={s} castShadow position={[s * (w / 2 - t / 2), h / 2, 0]}>
          <boxGeometry args={[t, h, d]} />
          <Mat color={color} selected={selected} />
        </mesh>
      ))}
      {/* top + bottom */}
      <mesh castShadow position={[0, h - t / 2, 0]}>
        <boxGeometry args={[w, t, d]} />
        <Mat color={color} selected={selected} />
      </mesh>
      <mesh castShadow position={[0, 0.025, 0]}>
        <boxGeometry args={[w, 0.05, d]} />
        <Mat color={color} selected={selected} />
      </mesh>
      {/* back */}
      <mesh position={[0, h / 2, -d / 2 + 0.01]}>
        <boxGeometry args={[w, h, 0.02]} />
        <Mat color={color} selected={selected} />
      </mesh>
      {/* shelves */}
      {shelves.map((f) => (
        <mesh key={f} castShadow position={[0, h * f, 0.01]}>
          <boxGeometry args={[Math.max(w - t * 2, 0.05), 0.025, Math.max(d - 0.04, 0.03)]} />
          <Mat color={color} selected={selected} />
        </mesh>
      ))}
      {/* optional cabinet doors across the open front (local +z) */}
      {doors &&
        [-1, 1].map((s) => (
          <group key={s}>
            <mesh castShadow position={[s * (w / 4 + 0.003), h / 2, d / 2 - 0.01]}>
              <boxGeometry args={[Math.max(w / 2 - 0.02, 0.05), Math.max(h - 0.08, 0.1), 0.015]} />
              <Mat color={shade(color, 0.12)} selected={selected} />
            </mesh>
            <mesh position={[s * 0.05, h / 2, d / 2 + 0.008]}>
              <boxGeometry args={[0.02, 0.18, 0.02]} />
              <Mat color="#5c5648" selected={selected} roughness={0.4} />
            </mesh>
          </group>
        ))}
    </group>
  );
}
