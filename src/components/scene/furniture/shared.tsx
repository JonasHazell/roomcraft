import * as THREE from 'three';
import type { FurnitureSize } from '../../../types';

export interface FurnitureProps {
  size: FurnitureSize;
  color: string;
  selected: boolean;
}

export const SELECT_EMISSIVE = '#2f6fdd';

const scratch = new THREE.Color();

/** Lighter shade of a hex color (amt 0–1 toward white). */
export function shade(color: string, amt: number): string {
  return `#${scratch.set(color).lerp(new THREE.Color('#ffffff'), amt).getHexString()}`;
}

export function Mat({
  color,
  selected,
  roughness = 0.85,
}: {
  color: string;
  selected: boolean;
  roughness?: number;
}) {
  return (
    <meshStandardMaterial
      color={color}
      roughness={roughness}
      emissive={selected ? SELECT_EMISSIVE : '#000000'}
      emissiveIntensity={selected ? 0.25 : 0}
    />
  );
}

/**
 * Four square legs, one at each corner of a w×d top, inset from the edges. Shared
 * by tables, desks and chairs. `height` is the leg length and `y` its centre.
 */
export function Legs({
  w,
  d,
  height,
  y,
  inset,
  thickness,
  color,
  selected,
}: {
  w: number;
  d: number;
  height: number;
  y: number;
  inset: number;
  thickness: number;
  color: string;
  selected: boolean;
}) {
  return (
    <>
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <mesh
            key={`${sx}${sz}`}
            castShadow
            position={[sx * (w / 2 - inset), y, sz * (d / 2 - inset)]}
          >
            <boxGeometry args={[thickness, height, thickness]} />
            <Mat color={color} selected={selected} />
          </mesh>
        )),
      )}
    </>
  );
}
