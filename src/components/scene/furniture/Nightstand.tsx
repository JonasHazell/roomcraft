import { optNum } from '../../../lib/furnitureOptions';
import { Mat, shade, type FurnitureProps } from './shared';

export function Nightstand({ size, color, selected, options }: FurnitureProps) {
  const { width: w, depth: d, height: h } = size;
  const drawers = optNum(options, 'drawers', 2);
  const gap = 0.02;
  const drawerH = Math.max((h - gap * (drawers + 1)) / drawers, 0.01);

  return (
    <group>
      <mesh castShadow position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, d]} />
        <Mat color={color} selected={selected} part="body" />
      </mesh>
      {/* drawer fronts with knobs on the front (local +z), stacked top to bottom */}
      {Array.from({ length: drawers }, (_, i) => {
        const cy = h - gap - drawerH / 2 - i * (drawerH + gap);
        return (
          <group key={i}>
            <mesh castShadow position={[0, cy, d / 2 + 0.005]}>
              <boxGeometry args={[w * 0.85, drawerH, 0.015]} />
              <Mat color={shade(color, 0.25)} selected={selected} part="drawers" />
            </mesh>
            <mesh castShadow position={[0, cy, d / 2 + 0.025]}>
              <sphereGeometry args={[0.015, 12, 12]} />
              <Mat color="#4a453c" selected={selected} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
