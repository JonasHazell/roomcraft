import { optBool, optStr } from '../../../lib/furnitureOptions';
import { Legs, Mat, type FurnitureProps } from './shared';

export function Table({ size, color, selected, options }: FurnitureProps) {
  const { width: w, depth: d, height: h } = size;
  const top = Math.min(0.06, h * 0.12);
  const inset = Math.min(0.08, w / 4, d / 4);
  const legs = optStr(options, 'legs', 'four');
  const shelf = optBool(options, 'shelf', false);
  const legH = h - top;

  return (
    <group>
      <mesh castShadow position={[0, h - top / 2, 0]}>
        <boxGeometry args={[w, top, d]} />
        <Mat color={color} selected={selected} />
      </mesh>
      {legs === 'panel' ? (
        // Two solid end panels instead of four legs.
        [-1, 1].map((s) => (
          <mesh key={s} castShadow position={[s * (w / 2 - 0.03), legH / 2, 0]}>
            <boxGeometry args={[0.06, legH, Math.max(d - 0.12, 0.05)]} />
            <Mat color={color} selected={selected} />
          </mesh>
        ))
      ) : (
        <Legs
          w={w}
          d={d}
          height={legH}
          y={legH / 2}
          inset={inset}
          thickness={0.06}
          color={color}
          selected={selected}
        />
      )}
      {/* optional lower shelf */}
      {shelf && (
        <mesh castShadow position={[0, Math.min(0.18, legH * 0.3), 0]}>
          <boxGeometry args={[Math.max(w - 0.16, 0.05), 0.03, Math.max(d - 0.16, 0.05)]} />
          <Mat color={color} selected={selected} />
        </mesh>
      )}
    </group>
  );
}
