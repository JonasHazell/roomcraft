import { useEffect, useMemo } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { floorPolygon } from '../../lib/polygon';
import { materialSpec } from '../../lib/materials';
import { materialBump, materialMap } from './materialTextures';
import { useDesignStore } from '../../store/useDesignStore';
import { useUiStore } from '../../store/useUiStore';
import { SELECT_EMISSIVE } from './furniture/shared';

/**
 * True when a still-click that landed on empty scenery (the floor, the ground
 * plane, a wall) should be ignored rather than clearing the current selection:
 * the user is mid additive-selection gesture — holding Shift/Ctrl/Cmd, or in the
 * touch "Select multiple" mode — and simply missed the piece they meant to add.
 * Nuking a whole in-progress multi-selection on a near-miss is a nasty papercut,
 * so treat the miss as a no-op. Shared by the floor/ground/wall click handlers.
 */
export function isAdditiveSelectMiss(e: ThreeEvent<MouseEvent>): boolean {
  const additive = e.shiftKey || e.ctrlKey || e.metaKey || useUiStore.getState().multiSelectMode;
  if (!additive) return false;
  const sel = useUiStore.getState().selection;
  return sel?.kind === 'furniture' || sel?.kind === 'furniture-multi';
}

/** Only deselect on a still click — not when a drag/camera orbit is released,
 *  and not when it's a near-miss during an additive selection (see above). */
export function deselectOnStillClick(e: ThreeEvent<MouseEvent>) {
  if (e.delta > 3) return;
  if (isAdditiveSelectMiss(e)) return;
  useUiStore.getState().select(null);
}

/** A still click on the floor selects it, surfacing the floor-colour bar. */
function selectFloorOnStillClick(e: ThreeEvent<MouseEvent>) {
  if (e.delta > 3) return;
  if (isAdditiveSelectMiss(e)) return;
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
  const selected = useUiStore((s) => s.selection?.kind === 'floor');

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
        emissive={selected ? SELECT_EMISSIVE : '#000000'}
        emissiveIntensity={selected ? 0.25 : 0}
      />
    </mesh>
  );
}
