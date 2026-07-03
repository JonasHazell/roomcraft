import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { WallId, WallOpening } from '../../types';
import { WALL_DEFS, WALL_T, buildWallGeometry, type WallDef } from '../../lib/geometry';
import { useDesignStore } from '../../store/useDesignStore';

const camDir = new THREE.Vector3();

export function Walls() {
  const groupRefs = useRef<Partial<Record<WallId, THREE.Group | null>>>({});

  // Dölj väggar mellan kameran och rummets mitt (origo). Muterar .visible
  // direkt — ingen state behövs eftersom flippen är diskret per frame.
  useFrame(({ camera }) => {
    camDir.copy(camera.position).normalize();
    for (const def of WALL_DEFS) {
      const group = groupRefs.current[def.id];
      if (group) group.visible = def.outwardNormal.dot(camDir) <= 0.1;
    }
  });

  return (
    <>
      {WALL_DEFS.map((def) => (
        <Wall
          key={def.id}
          def={def}
          ref={(g: THREE.Group | null) => {
            groupRefs.current[def.id] = g;
          }}
        />
      ))}
    </>
  );
}

function Wall({ def, ref }: { def: WallDef; ref: (g: THREE.Group | null) => void }) {
  const room = useDesignStore((s) => s.design.room);
  const openings = useDesignStore((s) => s.design.openings);
  const wallOpenings = useMemo(
    () => openings.filter((o) => o.wall === def.id),
    [openings, def.id],
  );

  const geometry = useMemo(
    () => buildWallGeometry(def.length(room), room.height, wallOpenings),
    [def, room, wallOpenings],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <group ref={ref} position={def.origin(room)} rotation-y={def.rotationY}>
      {/* FrontSide medvetet: extruderad sluten solid med utåtriktade normaler. */}
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial color={room.wallColor} roughness={0.95} />
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
