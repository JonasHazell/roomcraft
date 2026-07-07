import { Legs, Mat, type FurnitureProps } from './shared';

export function Table({ size, color, selected }: FurnitureProps) {
  const { width: w, depth: d, height: h } = size;
  const top = Math.min(0.06, h * 0.12);
  const inset = Math.min(0.08, w / 4, d / 4);
  return (
    <group>
      <mesh castShadow position={[0, h - top / 2, 0]}>
        <boxGeometry args={[w, top, d]} />
        <Mat color={color} selected={selected} />
      </mesh>
      <Legs
        w={w}
        d={d}
        height={h - top}
        y={(h - top) / 2}
        inset={inset}
        thickness={0.06}
        color={color}
        selected={selected}
      />
    </group>
  );
}
