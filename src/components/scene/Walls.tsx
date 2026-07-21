import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Wall, WallOpening } from '../../types';
import { WALL_T, buildWallGeometry, wallTransform } from '../../lib/geometry';
import type { ThreeEvent } from '@react-three/fiber';
import { exteriorEndExtension, outwardNormal, wallLen, wallMidpoint } from '../../lib/polygon';
import { materialSpec } from '../../lib/materials';
import { materialBump, materialMap } from './materialTextures';
import { useDesignStore } from '../../store/useDesignStore';
import { useUiStore } from '../../store/useUiStore';
import { SELECT_EMISSIVE } from './furniture/shared';

const camVec = new THREE.Vector3();

// Target opacity for an exterior wall standing between the camera and the room.
// Not 0 — a faint plane reads as "glass wall" and keeps the space legible.
const FADED_OPACITY = 0.15;
// Damping rate for the opacity cross-fade; higher = snappier.
const FADE_LAMBDA = 8;
// Below this opacity the wall is treated as see-through for picking, so clicks
// fall through to whatever is behind it.
const CLICK_PASSTHROUGH_OPACITY = 0.5;

export function Walls() {
  const walls = useDesignStore((s) => s.design.walls);
  const matRefs = useRef<Record<string, THREE.MeshStandardMaterial | null>>({});
  // Door-leaf materials keyed by their host wall's id (a wall can hold several
  // doors), so the fade loop can drive them in lock-step with the wall.
  const doorMatRefs = useRef<Record<string, Set<THREE.MeshStandardMaterial>>>({});

  // Stable so DoorLeaf's registration effect doesn't re-run every render. Returns
  // a cleanup that unregisters the material when the door unmounts.
  const registerDoorMat = useCallback(
    (wallId: string, mat: THREE.MeshStandardMaterial) => {
      const set = (doorMatRefs.current[wallId] ??= new Set());
      set.add(mat);
      return () => {
        set.delete(mat);
      };
    },
    [],
  );

  const fadeData = useMemo(
    () =>
      walls
        .filter((w) => w.kind === 'exterior')
        .map((w) => ({ id: w.id, mid: wallMidpoint(w), normal: outwardNormal(w) })),
    [walls],
  );

  // Fade exterior walls that stand between the camera and the room instead of
  // hiding them. The mesh stays in the scene, so it keeps casting its shadow —
  // the shadow depth pass ignores material opacity. The direction is taken from
  // the wall's midpoint so the heuristic works even for L-shaped/off-center rooms.
  useFrame(({ camera }, delta) => {
    for (const { id, mid, normal } of fadeData) {
      const mat = matRefs.current[id];
      if (!mat) continue;
      camVec
        .set(camera.position.x - mid.x, camera.position.y, camera.position.z - mid.z)
        .normalize();
      const facingCamera = normal.x * camVec.x + normal.z * camVec.z > 0.1;
      const target = facingCamera ? FADED_OPACITY : 1;
      mat.opacity = THREE.MathUtils.damp(mat.opacity, target, FADE_LAMBDA, delta);
      // Write depth only while (near) opaque, so furniture behind a faded wall
      // isn't clipped away.
      mat.depthWrite = mat.opacity > 0.98;
      // Fade any doors mounted on this wall in lock-step, so a see-through wall
      // doesn't leave its door panel floating opaque in mid-air.
      const doors = doorMatRefs.current[id];
      if (doors) {
        for (const dm of doors) {
          dm.opacity = mat.opacity;
          dm.depthWrite = mat.depthWrite;
        }
      }
    }
  });

  return (
    <>
      {walls.map((w, i) => (
        <WallMesh
          key={w.id}
          wall={w}
          endExtension={w.kind === 'exterior' ? exteriorEndExtension(walls, i) : 0}
          fadeable={w.kind === 'exterior'}
          matRef={(m: THREE.MeshStandardMaterial | null) => {
            matRefs.current[w.id] = m;
          }}
          registerDoorMat={registerDoorMat}
        />
      ))}
    </>
  );
}

function WallMesh({
  wall,
  endExtension,
  fadeable,
  matRef,
  registerDoorMat,
}: {
  wall: Wall;
  endExtension: number;
  fadeable: boolean;
  matRef: (m: THREE.MeshStandardMaterial | null) => void;
  registerDoorMat: (wallId: string, mat: THREE.MeshStandardMaterial) => () => void;
}) {
  const height = useDesignStore((s) => s.design.room.height);
  const wallColor = useDesignStore((s) => s.design.wallColor);
  const finish = materialSpec(useDesignStore((s) => s.design.wallMaterial));
  // Wall UVs are in metres (ExtrudeGeometry world UVs), so tile at the real size.
  const repeat = 1 / finish.texScale;
  const bump = finish.bumpScale > 0 ? materialBump(finish.id, 'surface', repeat) : null;
  const map = materialMap(finish.id, 'surface', repeat);
  // Cap wall reflectivity like the floor, so a shiny finish can't flare to white.
  const envIntensity = Math.min(finish.envMapIntensity, 0.4);
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
    // Faded walls are still raycast — pass the click through to what's behind.
    const mat = e.eventObject instanceof THREE.Mesh ? e.eventObject.material : null;
    if (mat instanceof THREE.MeshStandardMaterial && mat.transparent && mat.opacity < CLICK_PASSTHROUGH_OPACITY) {
      return;
    }
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
    <group position={origin} rotation-y={rotationY}>
      {/* FrontSide deliberately: extruded closed solid with outward-facing normals.
          castShadow stays on even when faded — the shadow depth pass ignores opacity. */}
      <mesh geometry={geometry} castShadow receiveShadow onClick={onClick}>
        <meshStandardMaterial
          key={finish.id}
          ref={matRef}
          color={wallColor}
          map={map}
          roughness={finish.roughness}
          metalness={finish.metalness}
          envMapIntensity={envIntensity}
          bumpMap={bump}
          bumpScale={bump ? finish.bumpScale : 0}
          transparent={fadeable}
          emissive={selected ? SELECT_EMISSIVE : '#000000'}
          emissiveIntensity={selected ? 0.25 : 0}
        />
      </mesh>
      {wallOpenings
        .filter((o) => o.kind === 'door')
        .map((o) => (
          <DoorLeaf
            key={o.id}
            opening={o}
            fadeable={fadeable}
            register={registerDoorMat}
          />
        ))}
      {wallOpenings
        .filter((o) => o.kind === 'window')
        .map((o) => (
          <WindowPane key={o.id} opening={o} />
        ))}
    </group>
  );
}

// A static door-coloured panel filling the opening — parity with WindowPane's
// own static simplicity (no open/close animation), so a door reads as a door
// in the 3D view instead of a bare hole in the wall (#355). Roughness anchors
// to the shared 'wood' finish; the colour is a fixed wood tone, same simplicity
// level WindowPane already uses for its glass tint.
//
// Both are exported (with WindowPane below) so the read-only shared-room viewer
// (`components/share/ShareScene.tsx`) renders identical door/window fill without
// duplicating the geometry. There, `fadeable`/`register` are omitted: the static
// viewer has no exterior-wall fade loop to hook into, so the door simply never
// registers for fading.
export function DoorLeaf({
  opening: o,
  fadeable = false,
  register,
}: {
  opening: WallOpening;
  fadeable?: boolean;
  register?: (wallId: string, mat: THREE.MeshStandardMaterial) => () => void;
}) {
  const finish = materialSpec('wood');
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  // Only doors on a fadeable (exterior) wall follow the wall's opacity; register
  // with the parent so the wall's fade loop drives this material too.
  useEffect(() => {
    if (!fadeable || !register || !matRef.current) return;
    return register(o.wallId, matRef.current);
  }, [fadeable, register, o.wallId]);
  return (
    <mesh position={[o.offset + o.width / 2, o.elevation + o.height / 2, WALL_T / 2]}>
      <boxGeometry args={[Math.max(o.width - 0.04, 0.02), Math.max(o.height - 0.04, 0.02), 0.02]} />
      <meshStandardMaterial
        ref={matRef}
        color="#8b5e34"
        roughness={finish.roughness}
        metalness={finish.metalness}
        transparent={fadeable}
      />
    </mesh>
  );
}

export function WindowPane({ opening: o }: { opening: WallOpening }) {
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
