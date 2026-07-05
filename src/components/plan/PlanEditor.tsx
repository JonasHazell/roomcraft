import { useEffect, useMemo, useRef, useState } from 'react';
import type { Point } from '../../types';
import {
  dist,
  axisLock,
  pointsEqual,
  polygonBounds,
  snap,
  snapPoint,
  snapToCornerAxis,
  wallDir,
  type Bounds,
} from '../../lib/polygon';
import { useDesignStore } from '../../store/useDesignStore';
import { useUiStore } from '../../store/useUiStore';
import { COARSE_POINTER, useMediaQuery } from '../../lib/useMediaQuery';
import { PlanGrid } from './PlanGrid';
import { PlanWalls } from './PlanWalls';
import { PlanDraft } from './PlanDraft';
import { PlanToolbar } from './PlanToolbar';
import { PlanWallPanel } from './PlanWallPanel';

export type PlanTool = 'select' | 'exterior' | 'interior';

/** Clicks within this radius of the start point close the outline. */
const CLOSE_RADIUS = 0.25;
const PAD = 2;
/** Zoom limits: smallest/largest visible width in meters. */
const MIN_SPAN = 2;
const MAX_SPAN = 400;
/** Pointer movement in pixels before a press counts as panning instead of a click. */
const PAN_THRESHOLD = 4;

export function PlanEditor() {
  const walls = useDesignStore((s) => s.design.walls);
  const commitExteriorPolygon = useDesignStore((s) => s.commitExteriorPolygon);
  const addInteriorWall = useDesignStore((s) => s.addInteriorWall);
  const moveWall = useDesignStore((s) => s.moveWall);
  const removeWall = useDesignStore((s) => s.removeWall);
  const selection = useUiStore((s) => s.selection);
  const select = useUiStore((s) => s.select);

  const svgRef = useRef<SVGSVGElement>(null);
  const coarse = useMediaQuery(COARSE_POINTER);
  const [tool, setTool] = useState<PlanTool>('select');
  const [draft, setDraft] = useState<Point[]>([]);
  const [hover, setHover] = useState<Point | null>(null);
  const [guide, setGuide] = useState<Point | null>(null);
  const [closable, setClosable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dragRef = useRef<{ id: string; horizontal: boolean } | null>(null);
  const panRef = useRef<{
    x: number;
    y: number;
    view: Bounds;
    scaleX: number;
    scaleZ: number;
    moved: boolean;
    deselectOnTap: boolean;
  } | null>(null);
  /** Active touch/pen pointers on the canvas, tracked so two of them pinch-zoom. */
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  /** Previous pinch distance/midpoint (screen px) while a two-finger gesture runs. */
  const pinchRef = useRef<{ dist: number; mid: { x: number; y: number } } | null>(null);

  /** The user's zoom/pan; null = auto-fit the view to the content. */
  const [view, setView] = useState<Bounds | null>(null);

  const fitBounds: Bounds = useMemo(() => {
    const pts = [...walls.flatMap((w) => [w.a, w.b]), ...draft];
    if (pts.length === 0) return { minX: -5, maxX: 5, minZ: -5, maxZ: 5 };
    const b = polygonBounds(pts);
    return {
      minX: b.minX - PAD,
      maxX: b.maxX + PAD,
      minZ: b.minZ - PAD,
      maxZ: b.maxZ + PAD,
    };
  }, [walls, draft]);

  const bounds = view ?? fitBounds;
  const boundsRef = useRef(bounds);
  boundsRef.current = bounds;

  // Scroll wheel zooms toward the cursor. Native listener: React's onWheel is
  // passive and cannot prevent the page from scrolling.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const b = boundsRef.current;
      const factor = Math.exp(e.deltaY * 0.0015);
      const span = (b.maxX - b.minX) * factor;
      if ((span < MIN_SPAN && factor < 1) || (span > MAX_SPAN && factor > 1)) return;
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
  }, []);

  /** Zooms around the centre of the current view; used by the +/− buttons. */
  const zoomBy = (factor: number) => {
    const b = boundsRef.current;
    const span = (b.maxX - b.minX) * factor;
    if ((span < MIN_SPAN && factor < 1) || (span > MAX_SPAN && factor > 1)) return;
    const cx = (b.minX + b.maxX) / 2;
    const cz = (b.minZ + b.maxZ) / 2;
    setView({
      minX: cx - (cx - b.minX) * factor,
      maxX: cx + (b.maxX - cx) * factor,
      minZ: cz - (cz - b.minZ) * factor,
      maxZ: cz + (b.maxZ - cz) * factor,
    });
  };

  /**
   * Two-finger pinch: scale toward the fingers' midpoint and pan with it.
   * Applied incrementally against the previous frame so it stays stable as the
   * view (and thus the SVG's screen CTM) changes underneath.
   */
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
    const bnds = boundsRef.current;
    const span = (bnds.maxX - bnds.minX) * factor;
    if ((span < MIN_SPAN && factor < 1) || (span > MAX_SPAN && factor > 1)) return;
    const ctm = svgRef.current?.getScreenCTM();
    if (!ctm) return;
    const inv = ctm.inverse();
    const wp = new DOMPoint(mid.x, mid.y).matrixTransform(inv);
    const wPrev = new DOMPoint(prev.mid.x, prev.mid.y).matrixTransform(inv);
    // Scale around the current midpoint, then translate by how far it moved.
    const dx = wp.x - wPrev.x;
    const dz = wp.y - wPrev.y;
    setView({
      minX: wp.x - (wp.x - bnds.minX) * factor - dx,
      maxX: wp.x + (bnds.maxX - wp.x) * factor - dx,
      minZ: wp.y - (wp.y - bnds.minZ) * factor - dz,
      maxZ: wp.y + (bnds.maxZ - wp.y) * factor - dz,
    });
  };

  const toWorld = (e: { clientX: number; clientY: number }): Point => {
    const ctm = svgRef.current?.getScreenCTM();
    if (!ctm) return { x: 0, z: 0 };
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    return { x: p.x, z: p.y };
  };

  /**
   * Snapped, axis-locked cursor position; the free coordinate also snaps to
   * already placed corners so the outline easily lines up with itself.
   */
  const drawTarget = (raw: Point): { point: Point; guide: Point | null } => {
    const last = draft[draft.length - 1];
    if (!last) return { point: snapPoint(raw), guide: null };
    const p = snapPoint(axisLock(last, raw));
    const snapped = snapToCornerAxis(p, draft.slice(0, -1), p.z === last.z);
    // A snap that collapses the point onto the previous corner prevents short walls.
    return pointsEqual(snapped.point, last) ? { point: p, guide: null } : snapped;
  };

  const cancelDraft = () => {
    setDraft([]);
    setError(null);
    setClosable(false);
    setGuide(null);
  };

  const tryClose = (points: Point[]) => {
    const result = commitExteriorPolygon(points);
    if (result.ok) {
      cancelDraft();
      setTool('select');
    } else {
      setError(result.reason);
    }
  };

  const appendExteriorPoint = (p: Point) => {
    const last = draft[draft.length - 1];
    if (last && pointsEqual(last, p)) return;
    if (draft.length >= 2) {
      // Prevent edges that fold back along the previous edge.
      const prev = draft[draft.length - 2];
      const d1 = wallDir({ a: prev, b: last });
      const d2 = wallDir({ a: last, b: p });
      const cross = d1.x * d2.z - d1.z * d2.x;
      const dot = d1.x * d2.x + d1.z * d2.z;
      if (Math.abs(cross) < 1e-6 && dot < 0) return;
    }
    setDraft([...draft, p]);
    setError(null);
  };

  /** Starts panning; the scale (m/pixel) is captured at start so the drag stays stable. */
  const startPan = (e: React.PointerEvent<SVGSVGElement>, deselectOnTap: boolean) => {
    const ctm = svgRef.current?.getScreenCTM();
    if (!ctm) return;
    const inv = ctm.inverse();
    const p0 = new DOMPoint(0, 0).matrixTransform(inv);
    const p1 = new DOMPoint(1, 1).matrixTransform(inv);
    panRef.current = {
      x: e.clientX,
      y: e.clientY,
      view: bounds,
      scaleX: p1.x - p0.x,
      scaleZ: p1.y - p0.y,
      moved: false,
      deselectOnTap,
    };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button === 1) {
      // Middle button pans in all modes.
      e.preventDefault();
      startPan(e, false);
      return;
    }
    if (e.button !== 0) return;
    // Track the pointer so a second contact turns the gesture into a pinch-zoom.
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointersRef.current.size >= 2) {
      // Second finger down: abandon any in-progress pan/drag and start pinching.
      panRef.current = null;
      dragRef.current = null;
      pinchRef.current = null;
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
      return;
    }
    const raw = toWorld(e);
    if (tool === 'exterior') {
      if (draft.length >= 4 && dist(raw, draft[0]) <= CLOSE_RADIUS) {
        tryClose(draft);
      } else {
        appendExteriorPoint(drawTarget(raw).point);
      }
    } else if (tool === 'interior') {
      const p = drawTarget(raw).point;
      const last = draft[draft.length - 1];
      if (!last) {
        setDraft([p]);
      } else if (!pointsEqual(last, p)) {
        addInteriorWall(last, p);
        setDraft([p]);
      }
    } else {
      // Select mode: dragging on empty space pans, a click without dragging
      // deselects on release (walls stop propagation).
      startPan(e, true);
    }
  };

  const onWallPointerDown = (id: string, e: React.PointerEvent) => {
    if (tool !== 'select' || e.button !== 0) return;
    e.stopPropagation();
    select({ kind: 'wall', id });
    const wall = walls.find((w) => w.id === id);
    if (!wall) return;
    dragRef.current = { id, horizontal: wall.a.z === wall.b.z };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (pointersRef.current.has(e.pointerId)) {
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }
    if (pointersRef.current.size >= 2) {
      applyPinch();
      return;
    }
    const pan = panRef.current;
    if (pan) {
      if (!pan.moved && Math.hypot(e.clientX - pan.x, e.clientY - pan.y) < PAN_THRESHOLD) return;
      pan.moved = true;
      setView({
        minX: pan.view.minX - (e.clientX - pan.x) * pan.scaleX,
        maxX: pan.view.maxX - (e.clientX - pan.x) * pan.scaleX,
        minZ: pan.view.minZ - (e.clientY - pan.y) * pan.scaleZ,
        maxZ: pan.view.maxZ - (e.clientY - pan.y) * pan.scaleZ,
      });
      return;
    }
    const raw = toWorld(e);
    if (tool === 'select') {
      const drag = dragRef.current;
      if (drag) moveWall(drag.id, snap(drag.horizontal ? raw.z : raw.x));
      return;
    }
    const target = drawTarget(raw);
    setHover(target.point);
    setGuide(target.guide);
    setClosable(tool === 'exterior' && draft.length >= 4 && dist(raw, draft[0]) <= CLOSE_RADIUS);
  };

  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    dragRef.current = null;
    const pan = panRef.current;
    if (pan) {
      if (!pan.moved && pan.deselectOnTap) select(null);
      panRef.current = null;
    }
  };

  // A cancelled pointer (e.g. the OS taking over) must not deselect on tap.
  const onPointerCancel = (e: React.PointerEvent<SVGSVGElement>) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    dragRef.current = null;
    panRef.current = null;
  };

  // Esc cancels the drawing in progress, Enter/double-click ends the interior wall chain.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && (draft.length > 0 || tool !== 'select')) {
        cancelDraft();
        setTool('select');
      } else if (e.key === 'Enter' && tool === 'interior') {
        cancelDraft();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [draft.length, tool]);

  const startExterior = () => {
    const message =
      'If you redraw the exterior walls, doors and windows on the current ' +
      'exterior walls will be removed once the new outline is complete. Continue?';
    if (walls.some((w) => w.kind === 'exterior') && !window.confirm(message)) return;
    select(null);
    cancelDraft();
    setTool('exterior');
  };

  const startInterior = () => {
    select(null);
    cancelDraft();
    setTool('interior');
  };

  const startSelect = () => {
    cancelDraft();
    setTool('select');
  };

  const selectedWall =
    selection?.kind === 'wall' ? walls.find((w) => w.id === selection.id) : undefined;

  const deleteDisabledReason = !selectedWall
    ? 'Select an interior wall to delete it.'
    : selectedWall.kind === 'exterior'
      ? 'Exterior walls cannot be deleted individually — use "Redraw exterior walls…".'
      : undefined;

  return (
    <div className="plan-editor">
      <svg
        ref={svgRef}
        viewBox={`${bounds.minX} ${bounds.minZ} ${bounds.maxX - bounds.minX} ${bounds.maxZ - bounds.minZ}`}
        style={{ cursor: tool === 'select' ? 'default' : 'crosshair' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onPointerLeave={() => {
          setHover(null);
          setGuide(null);
        }}
        onDoubleClick={() => tool === 'interior' && cancelDraft()}
      >
        <PlanGrid bounds={bounds} />
        <PlanWalls
          dimExterior={tool === 'exterior'}
          selectedWallId={selection?.kind === 'wall' ? selection.id : null}
          onWallPointerDown={onWallPointerDown}
        />
        {tool !== 'select' && (
          <PlanDraft draft={draft} hover={hover} guide={guide} closable={closable} />
        )}
      </svg>
      <div className="plan-overlay">
        <PlanToolbar
          tool={tool}
          error={error}
          coarse={coarse}
          draftActive={draft.length > 0}
          canDelete={selectedWall?.kind === 'interior'}
          deleteDisabledReason={deleteDisabledReason}
          canResetView={view !== null}
          onSelectTool={startSelect}
          onExteriorTool={startExterior}
          onInteriorTool={startInterior}
          onResetView={() => setView(null)}
          onZoomIn={() => zoomBy(0.8)}
          onZoomOut={() => zoomBy(1.25)}
          onFinishDraft={cancelDraft}
          onCancelDraft={startSelect}
          onDelete={() => {
            if (selectedWall) {
              removeWall(selectedWall.id);
              select(null);
            }
          }}
        />
        {tool === 'select' && <PlanWallPanel />}
      </div>
    </div>
  );
}
