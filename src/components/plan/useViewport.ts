import { useEffect, useRef, useState, type RefObject } from 'react';
import type { Point } from '../../types';
import type { Bounds } from '../../lib/polygon';

/** Zoom limits: smallest/largest visible width in meters. */
const MIN_SPAN = 2;
const MAX_SPAN = 400;
/** Pointer movement in pixels before a press counts as panning instead of a click. */
const PAN_THRESHOLD = 4;

interface PanState {
  x: number;
  y: number;
  view: Bounds;
  scaleX: number;
  scaleZ: number;
  moved: boolean;
  deselectOnTap: boolean;
}

export interface Viewport {
  /** The visible world rectangle (the user's zoom/pan, or the fit fallback). */
  bounds: Bounds;
  /** True when the user has zoomed/panned away from the auto-fit view. */
  isCustom: boolean;
  /** Screen point → world point via the SVG's current CTM. */
  toWorld: (e: { clientX: number; clientY: number }) => Point;
  /** Back to auto-fit. */
  reset: () => void;
  zoomIn: () => void;
  zoomOut: () => void;

  // --- Pointer-gesture bookkeeping (pan + two-finger pinch) ---
  pointerCount: () => number;
  addPointer: (id: number, x: number, y: number) => void;
  movePointer: (id: number, x: number, y: number) => boolean;
  removePointer: (id: number) => void;
  /** Scale/translate toward the two fingers' midpoint; call on move while pinching. */
  applyPinch: () => void;
  /** Forget the pinch baseline (on lift or when a gesture is abandoned). */
  resetPinch: () => void;
  /** Begins a pan from a press; `deselectOnTap` records whether a tap-without-move deselects. */
  beginPan: (clientX: number, clientY: number, view: Bounds, deselectOnTap: boolean) => void;
  isPanning: () => boolean;
  /** Applies a pan frame; returns true once the press has moved past the tap threshold. */
  panMove: (clientX: number, clientY: number) => boolean;
  /** Ends the pan; returns { moved, deselectOnTap } or null if none was active. */
  endPan: () => { moved: boolean; deselectOnTap: boolean } | null;
  cancelPan: () => void;
}

/**
 * Domain-less pan/zoom/pinch controller for an SVG canvas whose viewBox is a
 * world-space {@link Bounds}. Owns the view state and all pointer bookkeeping;
 * the caller decides when a press is a pan, a draw or a drag and calls the
 * matching methods. `fitBounds` is the auto-fit view used until the user zooms.
 */
export function useViewport(svgRef: RefObject<SVGSVGElement | null>, fitBounds: Bounds): Viewport {
  /** The user's zoom/pan; null = auto-fit the view to the content. */
  const [view, setView] = useState<Bounds | null>(null);
  const bounds = view ?? fitBounds;
  const boundsRef = useRef(bounds);
  boundsRef.current = bounds;

  const panRef = useRef<PanState | null>(null);
  /** Active touch/pen pointers on the canvas, tracked so two of them pinch-zoom. */
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  /** Previous pinch distance/midpoint (screen px) while a two-finger gesture runs. */
  const pinchRef = useRef<{ dist: number; mid: { x: number; y: number } } | null>(null);

  const withinLimit = (factor: number) => {
    const span = (boundsRef.current.maxX - boundsRef.current.minX) * factor;
    return !((span < MIN_SPAN && factor < 1) || (span > MAX_SPAN && factor > 1));
  };

  const toWorld = (e: { clientX: number; clientY: number }): Point => {
    const ctm = svgRef.current?.getScreenCTM();
    if (!ctm) return { x: 0, z: 0 };
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    return { x: p.x, z: p.y };
  };

  // Scroll wheel zooms toward the cursor. Native listener: React's onWheel is
  // passive and cannot prevent the page from scrolling.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const b = boundsRef.current;
      const factor = Math.exp(e.deltaY * 0.0015);
      if (!withinLimit(factor)) return;
      const ctm = svg.getScreenCTM();
      if (!ctm) return;
      const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
      setView({
        minX: p.x - (p.x - b.minX) * factor,
        maxX: p.x + (b.maxX - p.x) * factor,
        minZ: p.y - (p.y - b.minZ) * factor,
        maxZ: p.y + (b.maxZ - p.y) * factor,
      });
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [svgRef]);

  /** Zooms around the centre of the current view; used by the +/− buttons. */
  const zoomBy = (factor: number) => {
    if (!withinLimit(factor)) return;
    const b = boundsRef.current;
    const cx = (b.minX + b.maxX) / 2;
    const cz = (b.minZ + b.maxZ) / 2;
    setView({
      minX: cx - (cx - b.minX) * factor,
      maxX: cx + (b.maxX - cx) * factor,
      minZ: cz - (cz - b.minZ) * factor,
      maxZ: cz + (b.maxZ - cz) * factor,
    });
  };

  const applyPinch = () => {
    const pts = [...pointersRef.current.values()];
    if (pts.length < 2) return;
    const [a, b] = pts;
    const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const prev = pinchRef.current;
    pinchRef.current = { dist, mid };
    if (!prev) return;

    const factor = prev.dist / dist;
    if (!withinLimit(factor)) return;
    const ctm = svgRef.current?.getScreenCTM();
    if (!ctm) return;
    const inv = ctm.inverse();
    const wp = new DOMPoint(mid.x, mid.y).matrixTransform(inv);
    const wPrev = new DOMPoint(prev.mid.x, prev.mid.y).matrixTransform(inv);
    // Scale around the current midpoint, then translate by how far it moved.
    const dx = wp.x - wPrev.x;
    const dz = wp.y - wPrev.y;
    const bnds = boundsRef.current;
    setView({
      minX: wp.x - (wp.x - bnds.minX) * factor - dx,
      maxX: wp.x + (bnds.maxX - wp.x) * factor - dx,
      minZ: wp.y - (wp.y - bnds.minZ) * factor - dz,
      maxZ: wp.y + (bnds.maxZ - wp.y) * factor - dz,
    });
  };

  return {
    bounds,
    isCustom: view !== null,
    toWorld,
    reset: () => setView(null),
    zoomIn: () => zoomBy(0.8),
    zoomOut: () => zoomBy(1.25),

    pointerCount: () => pointersRef.current.size,
    addPointer: (id, x, y) => pointersRef.current.set(id, { x, y }),
    movePointer: (id, x, y) => {
      if (!pointersRef.current.has(id)) return false;
      pointersRef.current.set(id, { x, y });
      return true;
    },
    removePointer: (id) => pointersRef.current.delete(id),
    applyPinch,
    resetPinch: () => {
      pinchRef.current = null;
    },

    beginPan: (clientX, clientY, viewAtStart, deselectOnTap) => {
      const ctm = svgRef.current?.getScreenCTM();
      if (!ctm) return;
      const inv = ctm.inverse();
      const p0 = new DOMPoint(0, 0).matrixTransform(inv);
      const p1 = new DOMPoint(1, 1).matrixTransform(inv);
      panRef.current = {
        x: clientX,
        y: clientY,
        view: viewAtStart,
        scaleX: p1.x - p0.x,
        scaleZ: p1.y - p0.y,
        moved: false,
        deselectOnTap,
      };
    },
    isPanning: () => panRef.current !== null,
    panMove: (clientX, clientY) => {
      const pan = panRef.current;
      if (!pan) return false;
      if (!pan.moved && Math.hypot(clientX - pan.x, clientY - pan.y) < PAN_THRESHOLD) return false;
      pan.moved = true;
      setView({
        minX: pan.view.minX - (clientX - pan.x) * pan.scaleX,
        maxX: pan.view.maxX - (clientX - pan.x) * pan.scaleX,
        minZ: pan.view.minZ - (clientY - pan.y) * pan.scaleZ,
        maxZ: pan.view.maxZ - (clientY - pan.y) * pan.scaleZ,
      });
      return true;
    },
    endPan: () => {
      const pan = panRef.current;
      panRef.current = null;
      return pan ? { moved: pan.moved, deselectOnTap: pan.deselectOnTap } : null;
    },
    cancelPan: () => {
      panRef.current = null;
    },
  };
}
