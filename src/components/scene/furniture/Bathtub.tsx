import { optBool } from '../../../lib/furnitureOptions';
import { Mat, shade, type FurnitureProps } from './shared';

export function Bathtub({ size, color, selected, options }: FurnitureProps) {
  const { width: w, depth: d, height: h } = size;
  const tap = optBool(options, 'tap', true);
  const t = 0.1; // rim wall thickness
  const baseH = Math.min(0.14, h * 0.3);

  return (
    <group>
      {/* base slab */}
      <mesh castShadow position={[0, baseH / 2, 0]}>
        <boxGeometry args={[w, baseH, d]} />
        <Mat color={color} selected={selected} part="tub" />
      </mesh>
      {/* four rim walls, leaving the top open so the basin reads as a tub */}
      {[-1, 1].map((sz) => (
        <mesh key={`l${sz}`} castShadow position={[0, h / 2, sz * (d / 2 - t / 2)]}>
          <boxGeometry args={[w, h, t]} />
          <Mat color={color} selected={selected} part="tub" />
        </mesh>
      ))}
      {[-1, 1].map((sx) => (
        <mesh key={`s${sx}`} castShadow position={[sx * (w / 2 - t / 2), h / 2, 0]}>
          <boxGeometry args={[t, h, d]} />
          <Mat color={color} selected={selected} part="tub" />
        </mesh>
      ))}
      {/* inner basin floor */}
      <mesh position={[0, baseH + 0.01, 0]}>
        <boxGeometry args={[w - t * 2, 0.02, d - t * 2]} />
        <Mat color={shade(color, 0.05)} selected={selected} part="tub" />
      </mesh>
      {/* tap at one short end */}
      {tap && (
        <group position={[-w / 2 + t + 0.05, h, 0]}>
          <mesh position={[0, 0.04, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.14, 12]} />
            <Mat color="#b8bcc0" selected={selected} roughness={0.3} metalness={0.7} />
          </mesh>
          <mesh position={[0.07, 0.1, 0]} rotation-z={Math.PI / 2.4}>
            <cylinderGeometry args={[0.017, 0.017, 0.12, 12]} />
            <Mat color="#b8bcc0" selected={selected} roughness={0.3} metalness={0.7} />
          </mesh>
        </group>
      )}
    </group>
  );
}
