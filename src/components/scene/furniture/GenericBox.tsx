import { Mat, type FurnitureProps } from './shared';

export function GenericBox({ size, color, selected }: FurnitureProps) {
  const { width: w, depth: d, height: h } = size;
  return (
    <mesh castShadow position={[0, h / 2, 0]}>
      <boxGeometry args={[w, h, d]} />
      <Mat color={color} selected={selected} />
    </mesh>
  );
}
