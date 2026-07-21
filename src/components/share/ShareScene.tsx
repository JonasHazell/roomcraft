import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { Design, FurnitureItem, Wall } from '../../types';
import {
  exteriorEndExtension,
  floorPolygon,
  outwardNormal,
  polygonCenter,
  wallLen,
  wallMidpoint,
} from '../../lib/polygon';
import { buildWallGeometry, wallTransform } from '../../lib/geometry';
import { initialCameraPosition } from '../../lib/cameraFit';
import { materialSpec } from '../../lib/materials';
import { normalizeOptions } from '../../lib/furnitureOptions';
import { materialBump, materialMap } from '../scene/materialTextures';
import { DoorLeaf, WindowPane } from '../scene/Walls';
import { COMPONENTS, PartMaterials } from '../scene/FurnitureMesh';

/**
 * A read-only 3D room, built for the shared-link viewer (#353, `ShareView.tsx`).
 * Deliberately a *separate* renderer from `scene/Scene.tsx` rather than that
 * component reconfigured: `Scene.tsx` and its children (`Floor`, `Walls`,
 * `FurnitureMesh`) read the live, editable `useDesignStore`/`useUiStore`
 * singletons and wire up click-to-select and drag-to-move directly on the
 * meshes — exactly the editing behaviour a read-only viewer must not have, and
 * loading someone else's shared snapshot into the viewer's own local project
 * store would risk clobbering it. This component instead takes the snapshot as
 * a plain prop and renders it with no store, no selection, and no pointer
 * handlers — reusing the same pure geometry/material helpers and the same
 * per-kind furniture components (`COMPONENTS`/`PartMaterials`, exported from
 * `FurnitureMesh.tsx` for this purpose) so it looks identical, just inert.
 */
export function ShareScene({ design }: { design: Design }) {
  const floor = useMemo(() => floorPolygon(design.walls), [design.walls]);
  const center = useMemo(() => polygonCenter(floor), [floor]);
  const cameraPos = useMemo(() => initialCameraPosition(floor, center), [floor, center]);

  return (
    <Canvas shadows camera={{ position: cameraPos, fov: 45 }}>
      <color attach="background" args={['#eceef1']} />
      <fog attach="fog" args={['#eceef1', 28, 60]} />

      <ambientLight intensity={0.5} />
      <hemisphereLight args={['#ffffff', '#dfe3e8', 0.4]} />
      <directionalLight
        position={[8, 12, 6]}
        intensity={1.05}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
        shadow-camera-near={1}
        shadow-camera-far={40}
        shadow-bias={-0.0004}
      />

      <mesh rotation-x={-Math.PI / 2} position={[center.x, -0.03, center.z]} receiveShadow>
        <circleGeometry args={[45, 64]} />
        <meshStandardMaterial color="#e2e5e9" />
      </mesh>

      <ShareFloor
        walls={design.walls}
        floorColor={design.floorColor}
        floorMaterial={design.floorMaterial}
      />
      <ShareWalls design={design} />
      {design.furniture.map((item) => (
        <ShareFurniture key={item.id} item={item} />
      ))}

      <OrbitControls
        makeDefault
        maxPolarAngle={Math.PI / 2 - 0.05}
        minDistance={1.5}
        maxDistance={40}
        target={[center.x, design.room.height / 3, center.z]}
      />
    </Canvas>
  );
}

function ShareFloor({
  walls,
  floorColor,
  floorMaterial,
}: {
  walls: Wall[];
  floorColor: string;
  floorMaterial: string;
}) {
  const finish = materialSpec(floorMaterial);
  const repeat = 1 / finish.texScale;
  const bump = finish.bumpScale > 0 ? materialBump(finish.id, 'surface', repeat) : null;
  const map = materialMap(finish.id, 'surface', repeat);
  const envIntensity = Math.min(finish.envMapIntensity, 0.4);

  const geometry = useMemo(() => {
    const poly = floorPolygon(walls);
    const shape = new THREE.Shape();
    poly.forEach((p, i) => (i === 0 ? shape.moveTo(p.x, -p.z) : shape.lineTo(p.x, -p.z)));
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }, [walls]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh rotation-x={-Math.PI / 2} geometry={geometry} receiveShadow>
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

/** One inert piece: same footprint/finish resolution as the live `FurnitureMesh`,
 * with no drag/rotate/selection handlers. */
function ShareFurniture({ item }: { item: FurnitureItem }) {
  const Piece = COMPONENTS[item.kind];
  return (
    <group position={[item.position.x, item.elevation, item.position.z]} rotation-y={item.rotationY}>
      <PartMaterials
        kind={item.kind}
        materials={item.materials}
        legacy={item.material}
        colors={item.colors}
      >
        <Piece
          size={item.size}
          color={item.color}
          selected={false}
          options={normalizeOptions(item.kind, item.options)}
        />
      </PartMaterials>
    </group>
  );
}

const camVec = new THREE.Vector3();
const FADED_OPACITY = 0.15;
const FADE_LAMBDA = 8;

/** Fades exterior walls that stand between the camera and the room, mirroring
 * `scene/Walls.tsx`'s own behaviour — without it, orbiting the read-only view
 * would often just show the outside of a wall instead of the room. */
function ShareWalls({ design }: { design: Design }) {
  const matRefs = useRef<Record<string, THREE.MeshStandardMaterial | null>>({});

  const fadeData = useMemo(
    () =>
      design.walls
        .filter((w) => w.kind === 'exterior')
        .map((w) => ({ id: w.id, mid: wallMidpoint(w), normal: outwardNormal(w) })),
    [design.walls],
  );

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
      mat.depthWrite = mat.opacity > 0.98;
    }
  });

  return (
    <>
      {design.walls.map((w, i) => (
        <ShareWallMesh
          key={w.id}
          wall={w}
          endExtension={w.kind === 'exterior' ? exteriorEndExtension(design.walls, i) : 0}
          fadeable={w.kind === 'exterior'}
          height={design.room.height}
          wallColor={design.wallColor}
          wallMaterial={design.wallMaterial}
          openings={design.openings.filter((o) => o.wallId === w.id)}
          matRef={(m) => {
            matRefs.current[w.id] = m;
          }}
        />
      ))}
    </>
  );
}

function ShareWallMesh({
  wall,
  endExtension,
  fadeable,
  height,
  wallColor,
  wallMaterial,
  openings,
  matRef,
}: {
  wall: Wall;
  endExtension: number;
  fadeable: boolean;
  height: number;
  wallColor: string;
  wallMaterial: string;
  openings: Design['openings'];
  matRef: (m: THREE.MeshStandardMaterial | null) => void;
}) {
  const finish = materialSpec(wallMaterial);
  const repeat = 1 / finish.texScale;
  const bump = finish.bumpScale > 0 ? materialBump(finish.id, 'surface', repeat) : null;
  const map = materialMap(finish.id, 'surface', repeat);
  const envIntensity = Math.min(finish.envMapIntensity, 0.4);

  const geometry = useMemo(
    () => buildWallGeometry(wallLen(wall) + endExtension, height, openings),
    [wall, endExtension, height, openings],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);

  const { origin, rotationY } = wallTransform(wall);

  return (
    <group position={origin} rotation-y={rotationY}>
      <mesh geometry={geometry} castShadow receiveShadow>
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
        />
      </mesh>
      {openings.filter((o) => o.kind === 'door').map((o) => <DoorLeaf key={o.id} opening={o} />)}
      {openings
        .filter((o) => o.kind === 'window')
        .map((o) => (
          <WindowPane key={o.id} opening={o} />
        ))}
    </group>
  );
}
