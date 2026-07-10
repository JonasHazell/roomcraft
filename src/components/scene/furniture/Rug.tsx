import { optStr } from '../../../lib/furnitureOptions';
import { Mat, shade, type FurnitureProps } from './shared';

export function Rug({ size, color, selected, options }: FurnitureProps) {
  const { width: w, depth: d, height: h } = size;
  const pattern = optStr(options, 'pattern', 'solid');
  const accent = shade(color, 0.3);
  const top = h + 0.002;

  return (
    <group>
      {/* rug body */}
      <mesh castShadow receiveShadow position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, d]} />
        <Mat color={color} selected={selected} />
      </mesh>
      {/* inset border */}
      {pattern === 'border' && (
        <mesh rotation-x={-Math.PI / 2} position={[0, top, 0]}>
          <planeGeometry args={[Math.max(w - 0.24, 0.05), Math.max(d - 0.24, 0.05)]} />
          <meshStandardMaterial color={accent} roughness={0.9} />
        </mesh>
      )}
      {/* stripes running along the width */}
      {pattern === 'striped' &&
        [-0.3, 0, 0.3].map((f) => (
          <mesh key={f} rotation-x={-Math.PI / 2} position={[0, top, f * d]}>
            <planeGeometry args={[w, Math.max(d * 0.12, 0.05)]} />
            <meshStandardMaterial color={accent} roughness={0.9} />
          </mesh>
        ))}
    </group>
  );
}
