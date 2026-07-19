import { useMemo, useRef, useState, type ComponentType, type ReactNode } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { useCursor } from '@react-three/drei';
import * as THREE from 'three';
import type { FurnitureKind } from '../../types';
import { normalizeOptions } from '../../lib/furnitureOptions';
import { materialSpec } from '../../lib/materials';
import {
  normalizeMaterials,
  partColorOverride,
  partMaterial,
  primaryPart,
} from '../../lib/furnitureParts';
import { useDesignStore } from '../../store/useDesignStore';
import { useUiStore } from '../../store/useUiStore';
import { useHistoryStore } from '../../store/useHistoryStore';
import { useMediaQuery, COARSE_POINTER } from '../../lib/useMediaQuery';
import { rotateHandleRadius } from '../../lib/rotateHandle';
import { ACCENT } from '../../lib/theme';
import {
  MaterialContext,
  PartColorsContext,
  PartsContext,
  SELECT_EMISSIVE,
  type FurnitureProps,
} from './furniture/shared';
import { Bed } from './furniture/Bed';
import { Sofa } from './furniture/Sofa';
import { Table } from './furniture/Table';
import { Chair } from './furniture/Chair';
import { Wardrobe } from './furniture/Wardrobe';
import { Bookshelf } from './furniture/Bookshelf';
import { GenericBox } from './furniture/GenericBox';
import { Desk } from './furniture/Desk';
import { Nightstand } from './furniture/Nightstand';
import { Tv } from './furniture/Tv';
import { Mirror } from './furniture/Mirror';
import { Plant } from './furniture/Plant';
import { Rug } from './furniture/Rug';
import { Counter } from './furniture/Counter';
import { Stove } from './furniture/Stove';
import { Fridge } from './furniture/Fridge';
import { Toilet } from './furniture/Toilet';
import { Bathtub } from './furniture/Bathtub';
import { Sink } from './furniture/Sink';
import { FloorLamp } from './furniture/FloorLamp';
import { TableLamp } from './furniture/TableLamp';

/**
 * Kind → 3D component lookup. Exported so a read-only renderer (e.g. the shared
 * room viewer, `components/share/ShareScene.tsx`) can render the same pieces
 * without depending on the live editing store this file's own `FurnitureMesh`
 * reads from.
 */
export const COMPONENTS: Record<FurnitureKind, ComponentType<FurnitureProps>> = {
  bed: Bed,
  sofa: Sofa,
  table: Table,
  chair: Chair,
  desk: Desk,
  nightstand: Nightstand,
  tv: Tv,
  mirror: Mirror,
  plant: Plant,
  wardrobe: Wardrobe,
  bookshelf: Bookshelf,
  counter: Counter,
  stove: Stove,
  fridge: Fridge,
  toilet: Toilet,
  bathtub: Bathtub,
  sink: Sink,
  rug: Rug,
  box: GenericBox,
  'floor-lamp': FloorLamp,
  'table-lamp': TableLamp,
};

/**
 * Provides the per-part material resolver ({@link PartsContext}) and the primary
 * part as the fallback finish ({@link MaterialContext}) for a piece, so every
 * `Mat` inside — whether it names a part or not — renders the right finish.
 * Exported for the same reason as {@link COMPONENTS} above.
 */
export function PartMaterials({
  kind,
  materials,
  legacy,
  colors,
  children,
}: {
  kind: FurnitureKind;
  materials: Record<string, string> | undefined;
  legacy: string | undefined;
  colors: Record<string, string> | undefined;
  children: ReactNode;
}) {
  const resolved = useMemo(
    () => normalizeMaterials(kind, materials, legacy),
    [kind, materials, legacy],
  );
  const resolve = useMemo(
    () => (part: string) => materialSpec(partMaterial(kind, resolved, part)),
    [kind, resolved],
  );
  const fallback = useMemo(() => materialSpec(resolved[primaryPart(kind)]), [kind, resolved]);
  const resolveColor = useMemo(
    () => (part: string) => partColorOverride(colors, part),
    [colors],
  );
  return (
    <PartsContext.Provider value={resolve}>
      <PartColorsContext.Provider value={resolveColor}>
        <MaterialContext.Provider value={fallback}>{children}</MaterialContext.Provider>
      </PartColorsContext.Provider>
    </PartsContext.Provider>
  );
}

// Drag against the mathematical floor plane (not a mesh) so the drag continues
// even when the pointer leaves the furniture's silhouette.
const FLOOR_PLANE = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const hit = new THREE.Vector3();

// While dragging the rotation handle with Shift held, snap the angle to 15°
// increments for fine, predictable control.
const ROTATE_SNAP = Math.PI / 12;

// A right angle. Furniture usually wants to sit square to the walls, so the
// ring "magnetises" to the nearest multiple of this (0/90/180/270°).
const RIGHT_ANGLE = Math.PI / 2;
// With no modifier held, the ring gently snaps to the nearest right angle once
// the pointer comes within this arc of it (~7.5°). That makes aligning a piece
// to the walls effortless without any key, while every other angle stays freely
// reachable just outside the magnet.
const RIGHT_ANGLE_MAGNET = Math.PI / 24;

// The rotation handle's accent colour. Mirrors `--accent`; see `lib/theme`.
const ROTATE_HANDLE_COLOR = ACCENT;

export function FurnitureMesh({ id }: { id: string }) {
  const item = useDesignStore((s) => s.design.furniture.find((f) => f.id === id));
  const selected = useUiStore(
    (s) => s.selection?.kind === 'furniture' && s.selection.id === id,
  );
  const select = useUiStore((s) => s.select);
  const setDragging = useUiStore((s) => s.setDragging);
  const moveFurniture = useDesignStore((s) => s.moveFurniture);
  const updateFurniture = useDesignStore((s) => s.updateFurniture);
  const dragOffset = useRef({ x: 0, z: 0 });
  // True while the rotation handle is being dragged, so the move handler (which
  // shares the group's pointer events) steps aside.
  const rotatingRef = useRef(false);
  const [hovered, setHovered] = useState(false);
  const [rotHovered, setRotHovered] = useState(false);
  useCursor(hovered || rotHovered, 'grab');
  // Coarse (touch) pointers get a wider rotation-handle grab radius, mirroring
  // PlanCorners' corner hit target (0.34 vs 0.22 for a fine pointer).
  const coarse = useMediaQuery(COARSE_POINTER);

  if (!item) return null;
  const Piece = COMPONENTS[item.kind];

  // The rotation handle: a ring on the floor around the piece with a knob at its
  // front (local +z), so the knob doubles as an orientation marker. Sized off the
  // footprint and given a generous grab radius so it stays an easy target.
  const handleRadius = rotateHandleRadius(item.size.width, item.size.depth, coarse);
  // Sit just above the floor whatever the piece's elevation (the group is raised
  // by `elevation`, so subtract it to land back near y = 0).
  const handleY = 0.03 - item.elevation;

  const beginRotate = (e: ThreeEvent<PointerEvent>) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    rotatingRef.current = true;
    // Disable OrbitControls (it keys off draggingId) so spinning doesn't orbit.
    setDragging(id);
    useHistoryStore.getState().beginBatch();
  };

  const moveRotate = (e: ThreeEvent<PointerEvent>) => {
    if (!rotatingRef.current) return;
    if (!e.ray.intersectPlane(FLOOR_PLANE, hit)) return;
    const dx = hit.x - item.position.x;
    const dz = hit.z - item.position.z;
    if (Math.hypot(dx, dz) < 0.02) return; // pointer over the pivot — angle undefined
    // Point the piece's front (local +z) toward the pointer; matches frontDir's
    // (sin, cos) convention so the knob tracks the cursor.
    let angle = Math.atan2(dx, dz);
    if (e.shiftKey) {
      angle = Math.round(angle / ROTATE_SNAP) * ROTATE_SNAP;
    } else {
      // Magnetically settle onto the nearest right angle when close, so a piece
      // snaps square to the walls on its own — but leave everything outside the
      // magnet as free rotation.
      const nearest = Math.round(angle / RIGHT_ANGLE) * RIGHT_ANGLE;
      if (Math.abs(angle - nearest) < RIGHT_ANGLE_MAGNET) angle = nearest;
    }
    updateFurniture(id, { rotationY: angle });
  };

  const endRotate = (e: ThreeEvent<PointerEvent>) => {
    if (!rotatingRef.current) return;
    (e.target as Element).releasePointerCapture(e.pointerId);
    rotatingRef.current = false;
    setDragging(null);
    useHistoryStore.getState().endBatch();
  };

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (e.button !== 0) return; // right button is left to camera panning
    // A piece is selected on a still click (see onClick) — the same way walls
    // and floors are — so pressing down never selects on its own. That means an
    // orbit/pan that happens to start on a piece leaves it untouched. Only an
    // already-selected piece begins a drag-to-move from here.
    if (!selected) return;
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    if (e.ray.intersectPlane(FLOOR_PLANE, hit)) {
      dragOffset.current = { x: item.position.x - hit.x, z: item.position.z - hit.z };
      setDragging(id);
      // Fold the whole drag into a single undo step.
      useHistoryStore.getState().beginBatch();
    }
  };

  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (rotatingRef.current) return; // the rotation handle owns this drag
    if (useUiStore.getState().draggingId !== id) return;
    if (!e.ray.intersectPlane(FLOOR_PLANE, hit)) return;
    moveFurniture(id, hit.x + dragOffset.current.x, hit.z + dragOffset.current.z);
  };

  const endDrag = (e: ThreeEvent<PointerEvent>) => {
    if (useUiStore.getState().draggingId !== id) return;
    (e.target as Element).releasePointerCapture(e.pointerId);
    setDragging(null);
    useHistoryStore.getState().endBatch();
  };

  return (
    <group
      position={[item.position.x, item.elevation, item.position.z]}
      rotation-y={item.rotationY}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onClick={(e) => {
        // Select only on a still click — the same guard walls and floors use —
        // so releasing a camera orbit over a piece doesn't select it. A drag
        // (e.delta > 3) falls through without stopping propagation.
        if (e.delta > 3) return;
        // Stop the click so the floor behind the furniture doesn't deselect it.
        e.stopPropagation();
        select({ kind: 'furniture', id });
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      <PartMaterials
        kind={item.kind}
        materials={item.materials}
        legacy={item.material}
        colors={item.colors}
      >
        <Piece
          size={item.size}
          color={item.color}
          selected={selected}
          options={normalizeOptions(item.kind, item.options)}
        />
      </PartMaterials>
      {selected && (
        // The selection is projected down onto the floor so the footprint is
        // visible even when the furniture hangs above it.
        <mesh rotation-x={-Math.PI / 2} position-y={0.01 - item.elevation}>
          <planeGeometry args={[item.size.width + 0.14, item.size.depth + 0.14]} />
          <meshBasicMaterial color={SELECT_EMISSIVE} transparent opacity={0.5} />
        </mesh>
      )}
      {selected && (
        // Free-rotation handle: grab the ring or the front knob and spin. It
        // magnetises to right angles as you pass them; hold Shift while dragging
        // for a finer 15° snap. Keyboard R / Shift+R still work.
        <group
          onPointerDown={beginRotate}
          onPointerMove={moveRotate}
          onPointerUp={endRotate}
          onPointerCancel={endRotate}
          onPointerOver={(e) => {
            e.stopPropagation();
            setRotHovered(true);
          }}
          onPointerOut={() => setRotHovered(false)}
        >
          <mesh position-y={handleY} rotation-x={-Math.PI / 2}>
            <torusGeometry args={[handleRadius, 0.02, 8, 48]} />
            <meshBasicMaterial color={ROTATE_HANDLE_COLOR} transparent opacity={0.85} />
          </mesh>
          <mesh position={[0, handleY, handleRadius]}>
            <sphereGeometry args={[0.09, 20, 20]} />
            <meshBasicMaterial color={ROTATE_HANDLE_COLOR} />
          </mesh>
        </group>
      )}
    </group>
  );
}
