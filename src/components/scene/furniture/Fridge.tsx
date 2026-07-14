import type { ReactNode } from 'react';
import { optStr } from '../../../lib/furnitureOptions';
import { Mat, shade, type FurnitureProps } from './shared';

export function Fridge({ size, color, selected, options }: FurnitureProps) {
  const { width: w, depth: d, height: h } = size;
  const style = optStr(options, 'style', 'freezer-below');
  const face = d / 2 + 0.005;

  // A brushed-steel handle bar standing proud of the door face.
  const handle = (key: string, x: number, y: number, len: number): ReactNode => (
    <mesh key={key} position={[x, y, face + 0.03]}>
      <boxGeometry args={[0.03, len, 0.03]} />
      <Mat color="#8b8f93" selected={selected} roughness={0.3} metalness={0.7} />
    </mesh>
  );
  // A thin recessed line marking a door seam (horizontal or vertical).
  const seam = (key: string, vertical: boolean, at: number): ReactNode => (
    <mesh key={key} position={[vertical ? at : 0, vertical ? h / 2 : at, face - 0.001]}>
      <boxGeometry args={vertical ? [0.01, h - 0.06, 0.01] : [w - 0.04, 0.01, 0.01]} />
      <Mat color="#3b3b3d" selected={selected} roughness={0.6} />
    </mesh>
  );

  return (
    <group>
      {/* body */}
      <mesh castShadow position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, d]} />
        <Mat color={color} selected={selected} part="body" />
      </mesh>
      {/* slightly proud front panel so it reads as doors, not a plain box */}
      <mesh position={[0, h / 2, face - 0.004]}>
        <boxGeometry args={[w - 0.03, h - 0.05, 0.01]} />
        <Mat color={shade(color, 0.06)} selected={selected} part="body" />
      </mesh>
      {style === 'freezer-below' && [
        seam('s', false, h * 0.66),
        handle('h1', w / 2 - 0.08, h * 0.66 + h * 0.15, h * 0.22),
        handle('h2', w / 2 - 0.08, h * 0.33, h * 0.2),
      ]}
      {style === 'single' && handle('h', w / 2 - 0.08, h * 0.6, h * 0.5)}
      {style === 'side-by-side' && [
        seam('s', true, 0),
        handle('h1', -0.06, h * 0.6, h * 0.55),
        handle('h2', 0.06, h * 0.6, h * 0.55),
      ]}
    </group>
  );
}
