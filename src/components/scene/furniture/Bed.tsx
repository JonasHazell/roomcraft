import { optBool, optNum } from '../../../lib/furnitureOptions';
import { Mat, shade, type FurnitureProps } from './shared';

export function Bed({ size, color, selected, options }: FurnitureProps) {
  const { width: w, depth: d, height: h } = size;
  const mattresses = optNum(options, 'mattresses', 1);
  const headboard = optBool(options, 'headboard', true);

  const mattressColor = shade(color, 0.4);
  const mattressW = Math.max(w - 0.12, 0.05);
  const mattressD = Math.max(d - 0.12, 0.05);
  const mattressY = h * 0.775;
  const mattressH = h * 0.45;
  const gap = 0.04;

  // One slot per mattress: a full-width single, or an even split along the width.
  const slotW = (mattressW - (mattresses - 1) * gap) / mattresses;
  const slots = Array.from({ length: mattresses }, (_, i) => ({
    x: mattresses === 1 ? 0 : -mattressW / 2 + slotW / 2 + i * (slotW + gap),
    width: mattresses === 1 ? mattressW : slotW,
  }));

  return (
    <group>
      {/* base frame */}
      <mesh castShadow position={[0, h * 0.275, 0]}>
        <boxGeometry args={[w, h * 0.55, d]} />
        <Mat color={color} selected={selected} />
      </mesh>
      {/* one full mattress, or two split along the width */}
      {slots.map((slot, i) => (
        <mesh key={i} castShadow position={[slot.x, mattressY, 0]}>
          <boxGeometry args={[slot.width, mattressH, mattressD]} />
          <Mat color={mattressColor} selected={selected} />
        </mesh>
      ))}
      {/* one pillow centered on each mattress, near the headboard (local -z) */}
      {slots.map((slot, i) => {
        const pillowW = Math.min(0.5, slot.width - 0.12);
        return (
          <mesh key={`p${i}`} castShadow position={[slot.x, h + 0.04, -d / 2 + 0.28]}>
            <boxGeometry args={[pillowW, 0.09, 0.32]} />
            <Mat color={shade(color, 0.75)} selected={selected} />
          </mesh>
        );
      })}
      {/* headboard — sits flush behind the frame (local -z) so it never overlaps the bed,
          and runs the full height from the floor up */}
      {headboard && (
        <mesh castShadow position={[0, h * 0.55, -d / 2 - 0.03]}>
          <boxGeometry args={[w, h * 1.1, 0.06]} />
          <Mat color={shade(color, 0.15)} selected={selected} />
        </mesh>
      )}
    </group>
  );
}
