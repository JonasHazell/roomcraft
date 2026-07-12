import { useEffect, useMemo } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { floorPolygon } from '../../lib/polygon';
import { materialSpec } from '../../lib/materials';
import { materialBump, materialMap } from './materialTextures';
import { useDesignStore } from '../../store/useDesignStore';
import { useUiStore } from '../../store/useUiStore';

/** Only deselect on a still click — not when a drag/camera orbit is released. */
export function deselectOnStillClick(e: ThreeEvent<MouseEvent>) {
  if (e.delta > 3) return;
  useUiStore.getState().select(null);
}

/** A still click on the floor selects it, surfacing the floor-colour bar. */
function selectFloorOnStillClick(e: ThreeEvent<MouseEvent>) {
  if (e.delta > 3) return;
  e.stopPropagation();
  useUiStore.getState().select({ kind: 'floor' });
}

export function Floor() {
  const walls = useDesignStore((s) => s.design.walls);
  const floorColor = useDesignStore((s) => s.design.floorColor);
  const finish = materialSpec(useDesignStore((s) => s.design.floorMaterial));
  // Floor UVs are in metres (ShapeGeometry), so tile the pattern at its real size.
  const repeat = 1 / finish.texScale;
  const bump = finish.bumpScale > 0 ? materialBump(finish.id, 'surface', repeat) : null;
  const map = materialMap(finish.id, 'surface', repeat);
  // The floor is large and often seen at a grazing angle, where reflections peak.
  // Cap its reflectivity so even a shiny finish can't flare out to white.
  const envIntensity = Math.min(finish.envMapIntensity, 0.4);

  const geometry = useMemo(() => {
    const poly = floorPolygon(walls);
    const shape = new THREE.Shape();
    // With rotation-x = -π/2, local +y maps to world -z.
    poly.forEach((p, i) => (i === 0 ? shape.moveTo(p.x, -p.z) : shape.lineTo(p.x, -p.z)));
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }, [walls]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh
      rotation-x={-Math.PI / 2}
      geometry={geometry}
      receiveShadow
      onClick={selectFloorOnStillClick}
    >
      <meshStandardMaterial
        key={finish.id}
        color={floorColor}
        map={map}
        roughness={finish.roughness}
        metalness={finish.metalness}
        envMapIntensity={envIntensity}
        bumpMap={bump}
        bumpScale={bump ? finish.bumpScale : 0}
      />
    </mesh>
  );
}
