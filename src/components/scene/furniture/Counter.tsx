import { optBool, optNum } from '../../../lib/furnitureOptions';
import { Mat, shade, type FurnitureProps } from './shared';

export function Counter({ size, color, selected, options }: FurnitureProps) {
  const { width: w, depth: d, height: h } = size;
  const doors = optNum(options, 'cabinets', 3);
  const hasSink = optBool(options, 'sink', false);
  const topT = 0.04;
  const bodyH = Math.max(h - topT, 0.1);
  const bodyY = bodyH / 2;
  const slotW = doors > 0 ? w / doors : w;
  const basinW = Math.min(0.5, w * 0.4);
  const basinD = Math.min(0.4, d * 0.7);

  return (
    <group>
      {/* cabinet carcass */}
      <mesh castShadow position={[0, bodyY, 0]}>
        <boxGeometry args={[w, bodyH, d]} />
        <Mat color={color} selected={selected} part="cabinet" />
      </mesh>
      {/* worktop, overhanging the carcass a little */}
      <mesh castShadow position={[0, bodyH + topT / 2, 0]}>
        <boxGeometry args={[w + 0.04, topT, d + 0.04]} />
        <Mat color={shade(color, 0.1)} selected={selected} part="worktop" />
      </mesh>
      {/* cabinet doors on the working side (local +z) */}
      {Array.from({ length: doors }, (_, i) => {
        const cx = -w / 2 + slotW / 2 + i * slotW;
        return (
          <group key={i}>
            <mesh position={[cx, bodyY, d / 2 + 0.005]}>
              <boxGeometry args={[Math.max(slotW - 0.03, 0.05), Math.max(bodyH - 0.06, 0.1), 0.015]} />
              <Mat color={shade(color, 0.14)} selected={selected} part="cabinet" />
            </mesh>
            <mesh position={[cx + slotW / 2 - 0.05, bodyY, d / 2 + 0.025]}>
              <boxGeometry args={[0.02, 0.12, 0.02]} />
              <Mat color="#5c5648" selected={selected} roughness={0.4} />
            </mesh>
          </group>
        );
      })}
      {/* optional built-in sink dropped into the worktop, with a tap at the back */}
      {hasSink && (
        <group>
          <mesh position={[0, bodyH + topT + 0.005, 0.02]}>
            <boxGeometry args={[basinW, 0.05, basinD]} />
            <Mat color="#c9ccce" selected={selected} roughness={0.3} metalness={0.6} />
          </mesh>
          <mesh position={[0, bodyH + topT + 0.12, -d / 2 + 0.12]}>
            <cylinderGeometry args={[0.015, 0.015, 0.24, 12]} />
            <Mat color="#b8bcc0" selected={selected} roughness={0.3} metalness={0.7} />
          </mesh>
        </group>
      )}
    </group>
  );
}
