import { optBool } from '../../../lib/furnitureOptions';
import { Mat, shade, type FurnitureProps } from './shared';

export function Tv({ size, color, selected, options }: FurnitureProps) {
  const { width: w, depth: d, height: h } = size;
  const bench = optBool(options, 'bench', true);
  const soundbar = optBool(options, 'soundbar', false);
  const benchH = bench ? Math.min(0.35, h * 0.45) : 0;
  const screenGap = bench ? 0.08 : 0;
  const screenH = Math.max(h - benchH - screenGap, 0.2);
  const screenW = w * 0.92;
  const screenY = benchH + screenGap + screenH / 2;

  return (
    <group>
      {/* media bench */}
      {bench && (
        <mesh castShadow position={[0, benchH / 2, 0]}>
          <boxGeometry args={[w, benchH, d]} />
          <Mat color={shade(color, 0.35)} selected={selected} />
        </mesh>
      )}
      {/* screen toward the back, picture side facing local +z */}
      <mesh castShadow position={[0, screenY, -d / 2 + 0.08]}>
        <boxGeometry args={[screenW, screenH, 0.04]} />
        <Mat color={color} selected={selected} roughness={0.3} />
      </mesh>
      <mesh position={[0, screenY, -d / 2 + 0.105]}>
        <planeGeometry args={[screenW * 0.94, screenH * 0.88]} />
        <meshStandardMaterial color="#10151c" roughness={0.15} metalness={0.4} />
      </mesh>
      {/* stand (only when the screen rests on a bench) */}
      {bench && (
        <mesh castShadow position={[0, benchH + 0.04, -d / 2 + 0.08]}>
          <boxGeometry args={[screenW * 0.3, 0.08, 0.1]} />
          <Mat color={color} selected={selected} />
        </mesh>
      )}
      {/* optional soundbar just below the screen */}
      {soundbar && (
        <mesh castShadow position={[0, benchH + screenGap + 0.03, -d / 2 + 0.12]}>
          <boxGeometry args={[screenW * 0.8, 0.06, 0.08]} />
          <Mat color="#2b2b30" selected={selected} roughness={0.5} />
        </mesh>
      )}
    </group>
  );
}
