import { Mat, shade, type FurnitureProps } from './shared';

export function Nightstand({ size, color, selected }: FurnitureProps) {
  const { width: w, depth: d, height: h } = size;
  const drawerH = h * 0.28;
  return (
    <group>
      <mesh castShadow position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, d]} />
        <Mat color={color} selected={selected} />
      </mesh>
      {/* drawer front with knob on the front (local +z) */}
      <mesh castShadow position={[0, h - drawerH, d / 2 + 0.005]}>
        <boxGeometry args={[w * 0.85, drawerH, 0.015]} />
        <Mat color={shade(color, 0.25)} selected={selected} />
      </mesh>
      <mesh castShadow position={[0, h - drawerH, d / 2 + 0.025]}>
        <sphereGeometry args={[0.015, 12, 12]} />
        <Mat color="#4a453c" selected={selected} />
      </mesh>
    </group>
  );
}
