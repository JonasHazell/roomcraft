import { Mat, type FurnitureProps } from './shared';

export function Table({ size, color, selected }: FurnitureProps) {
  const { width: w, depth: d, height: h } = size;
  const top = Math.min(0.06, h * 0.12);
  const inset = Math.min(0.08, w / 4, d / 4);
  const leg = 0.06;
  return (
    <group>
      <mesh castShadow position={[0, h - top / 2, 0]}>
        <boxGeometry args={[w, top, d]} />
        <Mat color={color} selected={selected} />
      </mesh>
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <mesh
            key={`${sx}${sz}`}
            castShadow
            position={[sx * (w / 2 - inset), (h - top) / 2, sz * (d / 2 - inset)]}
          >
            <boxGeometry args={[leg, h - top, leg]} />
            <Mat color={color} selected={selected} />
          </mesh>
        )),
      )}
    </group>
  );
}
