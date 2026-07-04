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
