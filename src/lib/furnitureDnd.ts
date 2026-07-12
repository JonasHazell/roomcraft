import type { DragEvent } from 'react';
import type { FurnitureKind, FurnitureOptions, FurnitureSize, Point } from '../types';

/**
 * Tiny imperative bridge for dragging a piece from the "Add furniture" palette
 * onto the 3D room. HTML5 drag-and-drop can't carry a live JS object in its
 * dataTransfer, and the drop needs to project a screen point onto the floor —
 * which only the 3D scene's camera can do — so both bits of state live here as a
 * module singleton rather than in React state. No reactivity is needed: the drop
 * handler reads these synchronously.
 */

/** The furniture spec being dragged (structurally a `FurnitureSpec`/draft). */
export interface DragPayload {
  kind: FurnitureKind;
  name: string;
  size: FurnitureSize;
  elevation: number;
  color: string;
  colors?: Record<string, string>;
  material?: string;
  materials?: Record<string, string>;
  options?: FurnitureOptions;
}

let pending: DragPayload | null = null;
let projector: ((clientX: number, clientY: number) => Point | null) | null = null;

/** CSS hook: dims the covering "Add furniture" modal so the room shows through. */
const DRAG_CLASS = 'furniture-dragging';

/** Begin a palette drag: stash the payload and get the modal out of the way. */
export function beginFurnitureDrag(e: DragEvent, payload: DragPayload): void {
  pending = payload;
  e.dataTransfer.effectAllowed = 'copy';
  // Firefox only starts a drag once some data is set.
  e.dataTransfer.setData('text/plain', payload.name);
  document.body.classList.add(DRAG_CLASS);
}

/** End a palette drag (drop or cancel): restore the modal and clear leftovers. */
export function endFurnitureDrag(): void {
  document.body.classList.remove(DRAG_CLASS);
  pending = null;
}

/** The pending payload without consuming it — used by dragover to allow the drop. */
export function peekFurnitureDrag(): DragPayload | null {
  return pending;
}

/** Consume the pending payload (called on drop). */
export function takeFurnitureDrag(): DragPayload | null {
  const p = pending;
  pending = null;
  return p;
}

/** The 3D scene registers how to turn a screen point into a floor point. */
export function setFloorProjector(fn: ((clientX: number, clientY: number) => Point | null) | null): void {
  projector = fn;
}

/** Project a screen point onto the floor plane, or null if unavailable/off-plane. */
export function projectToFloor(clientX: number, clientY: number): Point | null {
  return projector ? projector(clientX, clientY) : null;
}
