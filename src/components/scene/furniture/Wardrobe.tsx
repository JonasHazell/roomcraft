import { optBool, optNum } from '../../../lib/furnitureOptions';
import { Mat, shade, type FurnitureProps } from './shared';

export function Wardrobe({ size, color, selected, options }: FurnitureProps) {
  const { width: w, depth: d, height: h } = size;
  const doors = optNum(options, 'doors', 2);
  const legs = optBool(options, 'legs', false);
  const legH = legs ? 0.1 : 0;
  const bodyH = Math.max(h - legH, 0.1);
  const bodyY = legH + bodyH / 2;
  const slotW = w / doors;

  return (
    <group>
      {/* carcass */}
      <mesh castShadow position={[0, bodyY, 0]}>
        <boxGeometry args={[w, bodyH, d]} />
        <Mat color={color} selected={selected} part="body" />
      </mesh>
      {/* door panels — one per door */}
      {Array.from({ length: doors }, (_, i) => {
        const cx = -w / 2 + slotW / 2 + i * slotW;
        // Handle sits toward the centre-facing edge of each door.
        const handleX = cx + (i < doors / 2 ? slotW / 2 - 0.06 : -slotW / 2 + 0.06);
        return (
          <group key={i}>
            <mesh position={[cx, bodyY, d / 2 + 0.005]}>
              <boxGeometry args={[Math.max(slotW - 0.03, 0.05), Math.max(bodyH - 0.08, 0.1), 0.015]} />
              <Mat color={shade(color, 0.12)} selected={selected} part="doors" />
            </mesh>
            <mesh position={[handleX, bodyY, d / 2 + 0.025]}>
              <boxGeometry args={[0.025, 0.22, 0.025]} />
              <Mat color="#5c5648" selected={selected} roughness={0.4} />
            </mesh>
          </group>
        );
      })}
      {/* optional legs */}
      {legs &&
        [-1, 1].flatMap((sx) =>
          [-1, 1].map((sz) => (
            <mesh key={`${sx}${sz}`} castShadow position={[sx * (w / 2 - 0.06), legH / 2, sz * (d / 2 - 0.06)]}>
              <boxGeometry args={[0.05, legH, 0.05]} />
              <Mat color={shade(color, 0.2)} selected={selected} part="body" />
            </mesh>
          )),
        )}
    </group>
  );
}
