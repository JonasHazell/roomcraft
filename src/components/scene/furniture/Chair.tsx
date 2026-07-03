import { Mat, type FurnitureProps } from './shared';

export function Chair({ size, color, selected }: FurnitureProps) {
  const { width: w, depth: d, height: h } = size;
  const seatY = h * 0.45;
  const seatT = 0.05;
  const inset = Math.min(0.05, w / 4, d / 4);
  return (
    <group>
      <mesh castShadow position={[0, seatY - seatT / 2, 0]}>
        <boxGeometry args={[w, seatT, d]} />
        <Mat color={color} selected={selected} />
      </mesh>
      <mesh castShadow position={[0, seatY + (h - seatY) / 2, -d / 2 + 0.025]}>
        <boxGeometry args={[w, h - seatY, 0.05]} />
        <Mat color={color} selected={selected} />
      </mesh>
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <mesh
            key={`${sx}${sz}`}
            castShadow
            position={[sx * (w / 2 - inset), (seatY - seatT) / 2, sz * (d / 2 - inset)]}
          >
            <boxGeometry args={[0.04, seatY - seatT, 0.04]} />
            <Mat color={color} selected={selected} />
          </mesh>
        )),
      )}
    </group>
  );
}
