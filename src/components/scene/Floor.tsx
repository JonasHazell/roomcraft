import { useEffect, useMemo } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { floorPolygon } from '../../lib/polygon';
import { useDesignStore } from '../../store/useDesignStore';
import { useUiStore } from '../../store/useUiStore';

/** Only deselect on a still click — not when a drag/camera orbit is released. */
export function deselectOnStillClick(e: ThreeEvent<MouseEvent>) {
  if (e.delta > 3) return;
  useUiStore.getState().select(null);
}

export function Floor() {
  const walls = useDesignStore((s) => s.design.walls);
  const floorColor = useDesignStore((s) => s.design.room.floorColor);

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
      onClick={deselectOnStillClick}
    >
      <meshStandardMaterial color={floorColor} roughness={0.9} />
    </mesh>
  );
}
