import { optBool } from '../../../lib/furnitureOptions';
import { Mat, type FurnitureProps } from './shared';

export function Mirror({ size, color, selected, options }: FurnitureProps) {
  const { width: w, depth: d, height: h } = size;
  const framed = optBool(options, 'frame', true);
  const frame = framed ? Math.min(0.04, w * 0.08) : 0;

  return (
    <group>
      {/* frame (skipped for a frameless mirror) */}
      {framed && (
        <mesh castShadow position={[0, h / 2, 0]}>
          <boxGeometry args={[w, h, d]} />
          <Mat color={color} selected={selected} part="frame" />
        </mesh>
      )}
      {/* glass surface on the front (local +z) */}
      <mesh castShadow position={[0, h / 2, framed ? d / 2 + 0.003 : 0]}>
        {framed ? (
          <planeGeometry args={[Math.max(w - frame * 2, 0.05), Math.max(h - frame * 2, 0.05)]} />
        ) : (
          <boxGeometry args={[w, h, Math.max(d, 0.02)]} />
        )}
        <meshStandardMaterial color="#dfe9ee" roughness={0.05} metalness={0.9} />
      </mesh>
    </group>
  );
}
