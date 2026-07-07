import { Legs, Mat, type FurnitureProps } from './shared';

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
      <Legs
        w={w}
        d={d}
        height={seatY - seatT}
        y={(seatY - seatT) / 2}
        inset={inset}
        thickness={0.04}
        color={color}
        selected={selected}
      />
    </group>
  );
}
