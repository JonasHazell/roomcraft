import { createContext, useContext } from 'react';
import * as THREE from 'three';
import type { FurnitureOptions, FurnitureSize } from '../../../types';
import { materialSpec, type MaterialSpec } from '../../../lib/materials';

export interface FurnitureProps {
  size: FurnitureSize;
  color: string;
  selected: boolean;
  /** Per-type customization, already normalized against the kind's option specs. */
  options: FurnitureOptions;
}

export const SELECT_EMISSIVE = '#2f6fdd';

/**
 * The finish for the piece currently being rendered. {@link FurnitureMesh} wraps
 * each piece in a provider so every {@link Mat} inside picks up the chosen
 * material without threading it through each component; the default is the plain
 * matte finish, so a piece rendered outside a provider looks as it always has.
 */
export const MaterialContext = createContext<MaterialSpec>(materialSpec(undefined));

const scratch = new THREE.Color();

/** Lighter shade of a hex color (amt 0–1 toward white). */
export function shade(color: string, amt: number): string {
  return `#${scratch.set(color).lerp(new THREE.Color('#ffffff'), amt).getHexString()}`;
}

/**
 * Standard material for a furniture surface. Roughness/metalness come from the
 * piece's chosen finish ({@link MaterialContext}); an explicit `roughness` or
 * `metalness` prop overrides it for a fixed detail (a screen, a metal handle).
 */
export function Mat({
  color,
  selected,
  roughness,
  metalness,
}: {
  color: string;
  selected: boolean;
  roughness?: number;
  metalness?: number;
}) {
  const finish = useContext(MaterialContext);
  return (
    <meshStandardMaterial
      color={color}
      roughness={roughness ?? finish.roughness}
      metalness={metalness ?? finish.metalness}
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
