import { createContext, useContext } from 'react';
import * as THREE from 'three';
import type { FurnitureOptions, FurnitureSize } from '../../../types';
import { materialSpec, type MaterialSpec } from '../../../lib/materials';
import { SELECT } from '../../../lib/theme';
import { materialBump, materialMap } from '../materialTextures';

export interface FurnitureProps {
  size: FurnitureSize;
  color: string;
  selected: boolean;
  /** Per-type customization, already normalized against the kind's option specs. */
  options: FurnitureOptions;
}

/** The selected-piece emissive glow colour. Mirrors `--select`; see `lib/theme`. */
export const SELECT_EMISSIVE = SELECT;

/**
 * The finish for the piece currently being rendered — the fallback for meshes
 * that don't name a part. {@link FurnitureMesh} wraps each piece in a provider so
 * every {@link Mat} inside picks up the chosen material without threading it
 * through each component; the default is the plain matte finish, so a piece
 * rendered outside a provider looks as it always has.
 */
export const MaterialContext = createContext<MaterialSpec>(materialSpec(undefined));

/**
 * Resolves a named part to its finish for the piece being rendered — the per-part
 * counterpart of {@link MaterialContext}. A {@link Mat} given a `part` reads this;
 * outside a provider it is null and Mat falls back to {@link MaterialContext}.
 */
export const PartsContext = createContext<((part: string) => MaterialSpec) | null>(null);

/**
 * Resolves a named part to its colour override, or `undefined` to keep the colour
 * the component computed. {@link FurnitureMesh} provides it so a `Mat` given a
 * `part` recolours just that part without threading colours through components.
 */
export const PartColorsContext = createContext<((part: string) => string | undefined) | null>(
  null,
);

const scratch = new THREE.Color();

/** Lighter shade of a hex color (amt 0–1 toward white). */
export function shade(color: string, amt: number): string {
  return `#${scratch.set(color).lerp(new THREE.Color('#ffffff'), amt).getHexString()}`;
}

/**
 * Standard material for a furniture surface. Roughness/metalness come from the
 * piece's chosen finish — the named `part`'s finish ({@link PartsContext}) if
 * given, otherwise the piece fallback ({@link MaterialContext}). An explicit
 * `roughness`/`metalness` prop overrides it for a fixed detail (a screen, a
 * metal handle).
 */
export function Mat({
  color,
  selected,
  roughness,
  metalness,
  part,
}: {
  color: string;
  selected: boolean;
  roughness?: number;
  metalness?: number;
  /** Which configurable part this surface belongs to; see furnitureParts. */
  part?: string;
}) {
  const fallback = useContext(MaterialContext);
  const resolvePart = useContext(PartsContext);
  const resolveColor = useContext(PartColorsContext);
  const finish = part && resolvePart ? resolvePart(part) : fallback;
  // A per-part colour override recolours just this part; otherwise keep the colour
  // the component computed (with its shade variations).
  const finalColor = (part && resolveColor && resolveColor(part)) || color;
  // Tile the finish's pattern/relief a couple of times across each piece's faces.
  const bump = finish.bumpScale > 0 ? materialBump(finish.id, 'furniture', 2) : null;
  const map = materialMap(finish.id, 'furniture', 2);
  return (
    // Key by finish so switching finish remounts the material: adding/removing a
    // `map` changes the shader, which a plain prop update wouldn't recompile.
    <meshStandardMaterial
      key={finish.id}
      color={finalColor}
      map={map}
      roughness={roughness ?? finish.roughness}
      metalness={metalness ?? finish.metalness}
      envMapIntensity={finish.envMapIntensity}
      bumpMap={bump}
      bumpScale={bump ? finish.bumpScale : 0}
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
  part,
}: {
  w: number;
  d: number;
  height: number;
  y: number;
  inset: number;
  thickness: number;
  color: string;
  selected: boolean;
  part?: string;
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
            <Mat color={color} selected={selected} part={part} />
          </mesh>
        )),
      )}
    </>
  );
}
