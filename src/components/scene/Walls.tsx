import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Wall, WallOpening } from '../../types';
import { WALL_T, buildWallGeometry, wallTransform } from '../../lib/geometry';
import type { ThreeEvent } from '@react-three/fiber';
import { exteriorEndExtension, outwardNormal, wallLen, wallMidpoint } from '../../lib/polygon';
import { useDesignStore } from '../../store/useDesignStore';
import { useUiStore } from '../../store/useUiStore';
import { SELECT_EMISSIVE } from './furniture/shared';

const camVec = new THREE.Vector3();

export function Walls() {
  const walls = useDesignStore((s) => s.design.walls);
  const groupRefs = useRef<Record<string, THREE.Group | null>>({});

  const hideData = useMemo(
    () =>
      walls
        .filter((w) => w.kind === 'exterior')
        .map((w) => ({ id: w.id, mid: wallMidpoint(w), normal: outwardNormal(w) })),
    [walls],
  );

  // Hide exterior walls between the camera and the room. The direction is taken
  // from the wall's midpoint so the heuristic works even for L-shaped/off-center
  // rooms. Mutates .visible directly — no state needed, the flip is discrete per frame.
  useFrame(({ camera }) => {
    for (const { id, mid, normal } of hideData) {
      const group = groupRefs.current[id];
      if (!group) continue;
      camVec
        .set(camera.position.x - mid.x, camera.position.y, camera.position.z - mid.z)
        .normalize();
      group.visible = normal.x * camVec.x + normal.z * camVec.z <= 0.1;
    }
  });

  return (
    <>
      {walls.map((w, i) => (
        <WallMesh
          key={w.id}
          wall={w}
          endExtension={w.kind === 'exterior' ? exteriorEndExtension(walls, i) : 0}
          ref={(g: THREE.Group | null) => {
            groupRefs.current[w.id] = g;
          }}
        />
      ))}
    </>
  );
}

function WallMesh({
  wall,
  endExtension,
  ref,
}: {
  wall: Wall;
  endExtension: number;
  ref: (g: THREE.Group | null) => void;
}) {
  const height = useDesignStore((s) => s.design.room.height);
  const wallColor = useDesignStore((s) => s.design.wallColor);
  const openings = useDesignStore((s) => s.design.openings);
  const selected = useUiStore(
    (s) => s.selection?.kind === 'wall' && s.selection.id === wall.id,
  );
  const select = useUiStore((s) => s.select);
  const wallOpenings = useMemo(
    () => openings.filter((o) => o.wallId === wall.id),
    [openings, wall.id],
  );

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    // Same still-click guard as deselectOnStillClick.
    if (e.delta > 3) return;
    // Camera-hidden walls are still raycast — pass the click through to what's behind.
    if (!e.eventObject.parent?.visible) return;
    e.stopPropagation();
    select({ kind: 'wall', id: wall.id });
  };

  const geometry = useMemo(
    () => buildWallGeometry(wallLen(wall) + endExtension, height, wallOpenings),
    [wall, endExtension, height, wallOpenings],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);

  const { origin, rotationY } = wallTransform(wall);

  return (
    <group ref={ref} position={origin} rotation-y={rotationY}>
      {/* FrontSide deliberately: extruded closed solid with outward-facing normals. */}
      <mesh geometry={geometry} castShadow receiveShadow onClick={onClick}>
        <meshStandardMaterial
          color={wallColor}
          roughness={0.95}
          emissive={selected ? SELECT_EMISSIVE : '#000000'}
          emissiveIntensity={selected ? 0.25 : 0}
        />
      </mesh>
      {wallOpenings
        .filter((o) => o.kind === 'window')
        .map((o) => (
          <WindowPane key={o.id} opening={o} />
        ))}
    </group>
  );
}

function WindowPane({ opening: o }: { opening: WallOpening }) {
  return (
    <mesh
      position={[o.offset + o.width / 2, o.elevation + o.height / 2, WALL_T / 2]}
    >
      <boxGeometry args={[Math.max(o.width - 0.04, 0.02), Math.max(o.height - 0.04, 0.02), 0.02]} />
      <meshStandardMaterial
        color="#b8d4dc"
        transparent
        opacity={0.35}
        depthWrite={false}
        roughness={0.2}
      />
    </mesh>
  );
}
