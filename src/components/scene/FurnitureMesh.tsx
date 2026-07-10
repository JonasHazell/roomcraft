import { useRef, useState, type ComponentType } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { useCursor } from '@react-three/drei';
import * as THREE from 'three';
import type { FurnitureKind } from '../../types';
import { normalizeOptions } from '../../lib/furnitureOptions';
import { useDesignStore } from '../../store/useDesignStore';
import { useUiStore } from '../../store/useUiStore';
import { useHistoryStore } from '../../store/useHistoryStore';
import { SELECT_EMISSIVE, type FurnitureProps } from './furniture/shared';
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

const COMPONENTS: Record<FurnitureKind, ComponentType<FurnitureProps>> = {
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
  rug: Rug,
  box: GenericBox,
};

// Drag against the mathematical floor plane (not a mesh) so the drag continues
// even when the pointer leaves the furniture's silhouette.
const FLOOR_PLANE = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const hit = new THREE.Vector3();

export function FurnitureMesh({ id }: { id: string }) {
  const item = useDesignStore((s) => s.design.furniture.find((f) => f.id === id));
  const selected = useUiStore(
    (s) => s.selection?.kind === 'furniture' && s.selection.id === id,
  );
  const select = useUiStore((s) => s.select);
  const setDragging = useUiStore((s) => s.setDragging);
  const moveFurniture = useDesignStore((s) => s.moveFurniture);
  const dragOffset = useRef({ x: 0, z: 0 });
  const [hovered, setHovered] = useState(false);
  useCursor(hovered, 'grab');

  if (!item) return null;
  const Piece = COMPONENTS[item.kind];

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (e.button !== 0) return; // right button is left to camera panning
    e.stopPropagation();
    // A piece must be selected before it can be dragged: the first click only
    // selects it, and a subsequent drag (while already selected) moves it.
    if (!selected) {
      select({ kind: 'furniture', id });
      return;
    }
    (e.target as Element).setPointerCapture(e.pointerId);
    if (e.ray.intersectPlane(FLOOR_PLANE, hit)) {
      dragOffset.current = { x: item.position.x - hit.x, z: item.position.z - hit.z };
      setDragging(id);
      // Fold the whole drag into a single undo step.
      useHistoryStore.getState().beginBatch();
    }
  };

  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
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
      <Piece
        size={item.size}
        color={item.color}
        selected={selected}
        options={normalizeOptions(item.kind, item.options)}
      />
      {selected && (
        // The selection is projected down onto the floor so the footprint is
        // visible even when the furniture hangs above it.
        <mesh rotation-x={-Math.PI / 2} position-y={0.01 - item.elevation}>
          <planeGeometry args={[item.size.width + 0.14, item.size.depth + 0.14]} />
          <meshBasicMaterial color={SELECT_EMISSIVE} transparent opacity={0.5} />
        </mesh>
      )}
    </group>
  );
}
