import { optBool } from '../../../lib/furnitureOptions';
import { Mat, shade, type FurnitureProps } from './shared';

export function Sink({ size, color, selected, options }: FurnitureProps) {
  const { width: w, depth: d, height: h } = size;
  const pedestal = optBool(options, 'pedestal', true);
  const mirror = optBool(options, 'mirror', false);
  const basinH = h * 0.2;
  const basinY = h - basinH / 2;
  const basinR = Math.min(w, d) * 0.34;

  return (
    <group>
      {/* basin block */}
      <mesh castShadow position={[0, basinY, 0]}>
        <boxGeometry args={[w, basinH, d]} />
        <Mat color={color} selected={selected} part="basin" />
      </mesh>
      {/* recessed bowl in the top of the basin */}
      <mesh position={[0, h - basinH * 0.35, d * 0.05]}>
        <cylinderGeometry args={[basinR, basinR * 0.8, basinH * 0.6, 24]} />
        <Mat color={shade(color, 0.08)} selected={selected} part="basin" />
      </mesh>
      {/* pedestal column, or a wall-hung basin when off */}
      {pedestal && (
        <mesh castShadow position={[0, (h - basinH) / 2, -d * 0.05]}>
          <cylinderGeometry args={[w * 0.16, w * 0.2, h - basinH, 20]} />
          <Mat color={color} selected={selected} part="pedestal" />
        </mesh>
      )}
      {/* tap at the back */}
      <mesh position={[0, h + 0.05, -d / 2 + 0.06]}>
        <cylinderGeometry args={[0.015, 0.015, 0.14, 12]} />
        <Mat color="#b8bcc0" selected={selected} roughness={0.3} metalness={0.7} />
      </mesh>
      <mesh position={[0, h + 0.11, -d / 2 + 0.12]} rotation-x={Math.PI / 2.6}>
        <cylinderGeometry args={[0.013, 0.013, 0.1, 12]} />
        <Mat color="#b8bcc0" selected={selected} roughness={0.3} metalness={0.7} />
      </mesh>
      {/* optional mirror above the basin */}
      {mirror && (
        <mesh position={[0, h + 0.45, -d / 2 + 0.03]}>
          <boxGeometry args={[w * 0.7, 0.5, 0.03]} />
          <meshStandardMaterial color="#c9d3d6" roughness={0.1} metalness={0.5} />
        </mesh>
      )}
    </group>
  );
}
