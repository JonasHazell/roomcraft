import { useMemo } from 'react';
import * as THREE from 'three';
import type { Point } from '../../types';
import { useDesignStore } from '../../store/useDesignStore';
import { useValidationStore } from '../../store/useValidationStore';

const VIOLATION_COLOR = '#d9482b';

function ZoneMesh({ zone }: { zone: Point[] }) {
  // Shape in (x, y) maps to the floor's (x, z) via rotation-x below.
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(zone[0].x, zone[0].z);
    for (let i = 1; i < zone.length; i++) shape.lineTo(zone[i].x, zone[i].z);
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }, [zone]);

  return (
    <mesh geometry={geometry} rotation-x={Math.PI / 2} position-y={0.015}>
      <meshBasicMaterial
        color={VIOLATION_COLOR}
        transparent
        opacity={0.35}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

/**
 * Highlights the selected validation issue in red in the 3D view: the footprints
 * of the furniture involved plus any floor zones (door swings, clearance zones, etc.).
 */
export function ValidationOverlay() {
  const highlight = useValidationStore((s) => s.highlight);
  const furniture = useDesignStore((s) => s.design.furniture);

  if (!highlight) return null;
  const items = furniture.filter((f) => highlight.furnitureIds.includes(f.id));

  return (
    <group>
      {highlight.zones.map((zone, i) => (
        <ZoneMesh key={i} zone={zone} />
      ))}
      {items.map((f) => (
        <group
          key={f.id}
          position={[f.position.x, 0, f.position.z]}
          rotation-y={f.rotationY}
        >
          <mesh rotation-x={-Math.PI / 2} position-y={0.02}>
            <planeGeometry args={[f.size.width + 0.16, f.size.depth + 0.16]} />
            <meshBasicMaterial
              color={VIOLATION_COLOR}
              transparent
              opacity={0.55}
              depthWrite={false}
            />
          </mesh>
          {/* Marker that is visible even behind other furniture. */}
          <mesh position-y={f.elevation + f.size.height + 0.35} rotation-x={Math.PI}>
            <coneGeometry args={[0.09, 0.26, 4]} />
            <meshBasicMaterial color={VIOLATION_COLOR} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
