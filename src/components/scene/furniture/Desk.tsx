import { optBool, optNum } from '../../../lib/furnitureOptions';
import { Legs, Mat, shade, type FurnitureProps } from './shared';

export function Desk({ size, color, selected, options }: FurnitureProps) {
  const { width: w, depth: d, height: h } = size;
  const top = Math.min(0.04, h * 0.1);
  const inset = Math.min(0.06, w / 4, d / 4);
  const monitors = optNum(options, 'monitors', 1);
  const drawers = optBool(options, 'drawers', true);
  const screenW = Math.min(0.6, (w * 0.9) / Math.max(monitors, 1) - 0.08);
  const screenH = Math.min(0.4, screenW * 0.6);

  return (
    <group>
      {/* top */}
      <mesh castShadow position={[0, h - top / 2, 0]}>
        <boxGeometry args={[w, top, d]} />
        <Mat color={color} selected={selected} part="top" />
      </mesh>
      {/* legs */}
      <Legs
        w={w}
        d={d}
        height={h - top}
        y={(h - top) / 2}
        inset={inset}
        thickness={0.05}
        color={color}
        selected={selected}
        part="base"
      />
      {/* optional drawer pedestal on the right side */}
      {drawers && (
        <group>
          <mesh castShadow position={[w / 2 - 0.2, (h - top) / 2, 0]}>
            <boxGeometry args={[0.36, h - top, Math.max(d - 0.08, 0.05)]} />
            <Mat color={shade(color, 0.1)} selected={selected} part="base" />
          </mesh>
          {[0.28, 0.52, 0.76].map((f) => (
            <mesh key={f} position={[w / 2 - 0.2, (h - top) * f, d / 2 - 0.02]}>
              <boxGeometry args={[0.3, (h - top) * 0.18, 0.02]} />
              <Mat color={shade(color, 0.28)} selected={selected} part="base" />
            </mesh>
          ))}
        </group>
      )}
      {/* monitors toward the back (the front/seating side is local +z) */}
      {Array.from({ length: monitors }, (_, i) => {
        const x = monitors === 1 ? 0 : -((monitors - 1) * (screenW + 0.1)) / 2 + i * (screenW + 0.1);
        return (
          <group key={i}>
            <mesh castShadow position={[x, h + 0.06 + screenH / 2, -d / 2 + 0.12]}>
              <boxGeometry args={[screenW, screenH, 0.03]} />
              <Mat color="#2c2c30" selected={selected} roughness={0.4} />
            </mesh>
            <mesh castShadow position={[x, h + 0.03, -d / 2 + 0.12]}>
              <boxGeometry args={[0.18, 0.06, 0.12]} />
              <Mat color={shade(color, 0.2)} selected={selected} part="base" />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
