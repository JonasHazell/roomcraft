import { optBool, optNum } from '../../../lib/furnitureOptions';
import { Mat, shade, type FurnitureProps } from './shared';

export function Bed({ size, color, selected, options }: FurnitureProps) {
  const { width: w, depth: d, height: h } = size;
  const mattresses = optNum(options, 'mattresses', 1);
  const pillows = optNum(options, 'pillows', 2);
  const headboard = optBool(options, 'headboard', true);

  const mattressColor = shade(color, 0.4);
  const mattressW = Math.max(w - 0.12, 0.05);
  const mattressD = Math.max(d - 0.12, 0.05);
  const mattressY = h * 0.775;
  const mattressH = h * 0.45;
  const gap = 0.04;
  const pillowW = Math.min(0.42, (mattressW - (pillows - 1) * 0.04) / Math.max(pillows, 1));

  return (
    <group>
      {/* base frame */}
      <mesh castShadow position={[0, h * 0.275, 0]}>
        <boxGeometry args={[w, h * 0.55, d]} />
        <Mat color={color} selected={selected} />
      </mesh>
      {/* one full mattress, or two split along the width */}
      {Array.from({ length: mattresses }, (_, i) => {
        const slotW = (mattressW - (mattresses - 1) * gap) / mattresses;
        const x = -mattressW / 2 + slotW / 2 + i * (slotW + gap);
        return (
          <mesh key={i} castShadow position={[mattresses === 1 ? 0 : x, mattressY, 0]}>
            <boxGeometry args={[mattresses === 1 ? mattressW : slotW, mattressH, mattressD]} />
            <Mat color={mattressColor} selected={selected} />
          </mesh>
        );
      })}
      {/* pillows in a row near the headboard (local -z) */}
      {Array.from({ length: pillows }, (_, i) => {
        const x = pillows === 1 ? 0 : -((pillows - 1) * (pillowW + 0.04)) / 2 + i * (pillowW + 0.04);
        return (
          <mesh key={`p${i}`} castShadow position={[x, h + 0.04, -d / 2 + 0.28]}>
            <boxGeometry args={[pillowW, 0.09, 0.32]} />
            <Mat color={shade(color, 0.75)} selected={selected} />
          </mesh>
        );
      })}
      {/* headboard */}
      {headboard && (
        <mesh castShadow position={[0, h * 0.65, -d / 2 + 0.03]}>
          <boxGeometry args={[w, h * 0.9, 0.06]} />
          <Mat color={shade(color, 0.15)} selected={selected} />
        </mesh>
      )}
    </group>
  );
}
