import { optBool, optNum } from '../../../lib/furnitureOptions';
import { Mat, shade, type FurnitureProps } from './shared';

export function Sofa({ size, color, selected, options }: FurnitureProps) {
  const { width: w, depth: d, height: h } = size;
  const seats = optNum(options, 'seats', 2);
  const armrests = optBool(options, 'armrests', true);
  const armW = armrests ? Math.min(0.16, w * 0.12) : 0;

  const innerW = Math.max(w - armW * 2 - 0.04, 0.1);
  const gap = 0.03;
  const cushionW = (innerW - (seats - 1) * gap) / seats;

  return (
    <group>
      {/* seat/base */}
      <mesh castShadow position={[0, h * 0.21, 0]}>
        <boxGeometry args={[w, h * 0.42, d]} />
        <Mat color={color} selected={selected} part="frame" />
      </mesh>
      {/* backrest */}
      <mesh castShadow position={[0, h / 2, -d / 2 + 0.1]}>
        <boxGeometry args={[w, h, Math.min(0.2, d * 0.3)]} />
        <Mat color={color} selected={selected} part="frame" />
      </mesh>
      {/* armrests */}
      {armrests &&
        [-1, 1].map((s) => (
          <mesh key={s} castShadow position={[s * (w / 2 - armW / 2), h * 0.36, 0]}>
            <boxGeometry args={[armW, h * 0.72, d]} />
            <Mat color={color} selected={selected} part="frame" />
          </mesh>
        ))}
      {/* seat cushions — one per seat */}
      {Array.from({ length: seats }, (_, i) => {
        const x = -innerW / 2 + cushionW / 2 + i * (cushionW + gap);
        return (
          <mesh key={i} castShadow position={[x, h * 0.5, 0.05]}>
            <boxGeometry args={[cushionW, h * 0.17, Math.max(d - 0.24, 0.1)]} />
            <Mat color={shade(color, 0.25)} selected={selected} part="cushions" />
          </mesh>
        );
      })}
    </group>
  );
}
