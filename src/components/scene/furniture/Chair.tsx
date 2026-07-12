import { optBool } from '../../../lib/furnitureOptions';
import { Legs, Mat, shade, type FurnitureProps } from './shared';

export function Chair({ size, color, selected, options }: FurnitureProps) {
  const { width: w, depth: d, height: h } = size;
  const seatY = h * 0.45;
  const seatT = 0.05;
  const inset = Math.min(0.05, w / 4, d / 4);
  const armrests = optBool(options, 'armrests', false);
  const cushion = optBool(options, 'cushion', false);

  return (
    <group>
      <mesh castShadow position={[0, seatY - seatT / 2, 0]}>
        <boxGeometry args={[w, seatT, d]} />
        <Mat color={color} selected={selected} part="frame" />
      </mesh>
      {/* optional seat cushion */}
      {cushion && (
        <mesh castShadow position={[0, seatY + 0.02, 0]}>
          <boxGeometry args={[Math.max(w - 0.06, 0.05), 0.04, Math.max(d - 0.06, 0.05)]} />
          <Mat color={shade(color, 0.3)} selected={selected} part="cushion" />
        </mesh>
      )}
      <mesh castShadow position={[0, seatY + (h - seatY) / 2, -d / 2 + 0.025]}>
        <boxGeometry args={[w, h - seatY, 0.05]} />
        <Mat color={color} selected={selected} part="frame" />
      </mesh>
      {/* optional armrests */}
      {armrests &&
        [-1, 1].map((s) => (
          <mesh key={s} castShadow position={[s * (w / 2 - 0.025), seatY + 0.12, 0]}>
            <boxGeometry args={[0.04, 0.05, Math.max(d - 0.1, 0.05)]} />
            <Mat color={color} selected={selected} part="frame" />
          </mesh>
        ))}
      <Legs
        w={w}
        d={d}
        height={seatY - seatT}
        y={(seatY - seatT) / 2}
        inset={inset}
        thickness={0.04}
        color={color}
        selected={selected}
        part="frame"
      />
    </group>
  );
}
