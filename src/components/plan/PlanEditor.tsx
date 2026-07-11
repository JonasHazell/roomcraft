import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Point } from '../../types';
import {
  dist,
  axisLock,
  pointsEqual,
  polygonBounds,
  snap,
  snapPoint,
  snapToCornerAxis,
  type Bounds,
} from '../../lib/polygon';
import { useDesignStore } from '../../store/useDesignStore';
import { useUiStore } from '../../store/useUiStore';
import { useHistoryStore } from '../../store/useHistoryStore';
import { confirmDialog } from '../../store/useDialogStore';
import { backToLobby } from '../../lib/nav';
import { COARSE_POINTER, useMediaQuery } from '../../lib/useMediaQuery';
import { PlanGrid } from './PlanGrid';
import { PlanWalls } from './PlanWalls';
import { PlanCorners } from './PlanCorners';
import { PlanDraft } from './PlanDraft';
import { PlanToolbar } from './PlanToolbar';
import { PlanLengthInput } from './PlanLengthInput';
import { PlanWallPanel } from './PlanWallPanel';
import { PlanRoomPanel } from './PlanRoomPanel';
import { Icon } from '../ui/Icon';
import { useViewport } from './useViewport';
import { usePlanDraft } from './usePlanDraft';

export type { PlanTool } from './usePlanDraft';

/** Clicks within this radius of the start point close the outline. */
const CLOSE_RADIUS = 0.25;
const PAD = 2;

export function PlanEditor() {
  const walls = useDesignStore((s) => s.design.walls);
  const commitExteriorPolygon = useDesignStore((s) => s.commitExteriorPolygon);
  const addInteriorWall = useDesignStore((s) => s.addInteriorWall);
  const moveWall = useDesignStore((s) => s.moveWall);
  const moveCorner = useDesignStore((s) => s.moveCorner);
  const removeWall = useDesignStore((s) => s.removeWall);
  const selection = useUiStore((s) => s.selection);
  const select = useUiStore((s) => s.select);

  const svgRef = useRef<SVGSVGElement>(null);
  const coarse = useMediaQuery(COARSE_POINTER);
  // A new room opens with the exterior tool armed so the user draws its outline
  // right away; editing an existing plan opens in select mode.
  const draw = usePlanDraft(useUiStore.getState().planStartTool);
  const { tool, draft, hover, guide, closable, error } = draw.state;
  // A wall being dragged in select mode (domain drag, distinct from viewport pan).
  const dragRef = useRef<{ id: string; horizontal: boolean } | null>(null);
  // A corner (shared point of two exterior walls) being dragged in select mode.
  const cornerDragRef = useRef<{ wallAId: string; wallBId: string } | null>(null);
  // A press-drag-release (or tap) drawing gesture: the pointer that owns it.
  const drawGestureRef = useRef<{ pointerId: number } | null>(null);
  // Walls whose length is actively changing under a drag, highlighted so the
  // relevant measurements stand out while the corner or edge moves.
  const [activeWallIds, setActiveWallIds] = useState<string[]>([]);
  // The edge currently being aimed while drawing: its unit direction and live
  // length, kept in state so the length box can show the distance and place the
  // corner at an exact value. It survives the pointer leaving the canvas (to
  // reach the box), and is cleared once a point is placed or the tool changes.
  const [pending, setPending] = useState<{ dir: Point; len: number } | null>(null);

  // The start tool is a one-shot handoff from the lobby; clear it once consumed
  // so re-entering an existing plan later opens in select mode.
  useEffect(() => {
    useUiStore.getState().setPlanStartTool('select');
  }, []);

  // A placed point (or a tool switch) invalidates the aimed edge: drop it so the
  // length box waits for the next aim rather than reusing a stale direction.
  useEffect(() => setPending(null), [draft.length, tool]);

  // While a drawing is in progress, undo/redo (buttons and Ctrl/Cmd+Z) step
  // through the placed points instead of the document history, so a misplaced
  // corner can be taken back. The bridge is cleared once the draft empties, so
  // undo then resumes reversing committed changes as usual.
  const { redo: draftRedo, undo: draftUndo } = draw;
  const redoDepth = draw.state.redo.length;
  useEffect(() => {
    const active = draft.length > 0 || redoDepth > 0;
    useHistoryStore.getState().setDraftBridge(
      active
        ? { canUndo: draft.length > 0, canRedo: redoDepth > 0, undo: draftUndo, redo: draftRedo }
        : null,
    );
  }, [draft.length, redoDepth, draftUndo, draftRedo]);

  // On leaving the editor, drop the bridge so document undo/redo works elsewhere.
  useEffect(() => () => useHistoryStore.getState().setDraftBridge(null), []);

  // The auto-fit view is derived from the placed walls only — never the
  // in-progress draft. Folding draft points in made the camera zoom/jump the
  // moment the first corner was clicked (a single point + padding is a tiny
  // box), so the user lost track of where they were. Excluding the draft keeps
  // the view steady while drawing.
  const fitBounds: Bounds = useMemo(() => {
    const pts = walls.flatMap((w) => [w.a, w.b]);
    if (pts.length === 0) return { minX: -5, maxX: 5, minZ: -5, maxZ: 5 };
    const b = polygonBounds(pts);
    return { minX: b.minX - PAD, maxX: b.maxX + PAD, minZ: b.minZ - PAD, maxZ: b.maxZ + PAD };
  }, [walls]);

  const viewport = useViewport(svgRef, fitBounds);
  const bounds = viewport.bounds;

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

  const tryClose = (points: Point[]) => {
    const result = commitExteriorPolygon(points);
    if (result.ok) draw.committed();
    else draw.setError(result.reason);
  };

  // Place the next corner at an exact distance (cm) along the currently aimed
  // direction — the length box's Enter action. Works mid-draw, so an edge can be
  // sized precisely before the room is closed.
  const placeExactLength = (cm: number) => {
    const last = draft[draft.length - 1];
    if (!last || !pending || cm <= 0) return;
    const m = cm / 100;
    const round = (v: number) => Math.round(v * 1000) / 1000;
    draw.place({ x: round(last.x + pending.dir.x * m), z: round(last.z + pending.dir.z * m) });
    draw.clearHover();
  };

  // Ends the interior chain: turns the buffered points into walls as a single
  // undo step, then clears the draft so the next chain starts fresh.
  const finishInterior = useCallback(() => {
    const history = useHistoryStore.getState();
    history.beginBatch();
    for (let i = 1; i < draft.length; i++) addInteriorWall(draft[i - 1], draft[i]);
    history.endBatch();
    draw.cancel();
  }, [draft, addInteriorWall, draw]);

  const capture = (e: React.PointerEvent<SVGSVGElement>) =>
    (e.currentTarget as Element).setPointerCapture(e.pointerId);

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button === 1) {
      // Middle button pans in all modes.
      e.preventDefault();
      viewport.beginPan(e.clientX, e.clientY, bounds, false);
      capture(e);
      return;
    }
    if (e.button !== 0) return;
    // Track the pointer so a second contact turns the gesture into a pinch-zoom.
    viewport.addPointer(e.pointerId, e.clientX, e.clientY);
    if (viewport.pointerCount() >= 2) {
      // Second finger down: abandon any in-progress pan/drag/draw and start pinching.
      viewport.cancelPan();
      if (dragRef.current || cornerDragRef.current) useHistoryStore.getState().endBatch();
      dragRef.current = null;
      cornerDragRef.current = null;
      setActiveWallIds([]);
      drawGestureRef.current = null;
      viewport.resetPinch();
      capture(e);
      return;
    }
    if (tool === 'exterior' || tool === 'interior') {
      // Nothing is committed on press: pressing only starts the gesture. Dragging
      // previews the corner and its live distance to the previous one, and
      // releasing places it where the measurement reads right (or seals the
      // outline if released on the start corner). A plain tap is a zero-length
      // drag, so it places one corner — identically on mouse and touch.
      drawGestureRef.current = { pointerId: e.pointerId };
      capture(e);
      return;
    }
    // Select mode: dragging on empty space pans, a click without dragging
    // deselects on release (walls and corner handles stop propagation).
    viewport.beginPan(e.clientX, e.clientY, bounds, true);
    capture(e);
  };

  const onWallPointerDown = (id: string, e: React.PointerEvent) => {
    if (tool !== 'select' || e.button !== 0) return;
    e.stopPropagation();
    select({ kind: 'wall', id });
    const wall = walls.find((w) => w.id === id);
    if (!wall) return;
    dragRef.current = { id, horizontal: wall.a.z === wall.b.z };
    // Highlight the wall and any wall sharing a corner with it: sliding this wall
    // changes those neighbours' lengths, so their measurements are the relevant ones.
    const shares = (w: (typeof walls)[number]) =>
      w.id !== id &&
      (pointsEqual(w.a, wall.a) ||
        pointsEqual(w.a, wall.b) ||
        pointsEqual(w.b, wall.a) ||
        pointsEqual(w.b, wall.b));
    setActiveWallIds([id, ...walls.filter(shares).map((w) => w.id)]);
    // Fold the whole wall drag into a single undo step.
    useHistoryStore.getState().beginBatch();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };

  const onCornerPointerDown = (wallAId: string, wallBId: string, e: React.PointerEvent) => {
    if (tool !== 'select' || e.button !== 0) return;
    e.stopPropagation();
    // A corner drag reshapes the outline, not a single wall — clear any selection
    // so the wall panel doesn't fight the gesture, and highlight both walls whose
    // lengths change as the corner moves.
    select(null);
    cornerDragRef.current = { wallAId, wallBId };
    setActiveWallIds([wallAId, wallBId]);
    useHistoryStore.getState().beginBatch();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    viewport.movePointer(e.pointerId, e.clientX, e.clientY);
    if (viewport.pointerCount() >= 2) {
      viewport.applyPinch();
      return;
    }
    if (viewport.isPanning()) {
      viewport.panMove(e.clientX, e.clientY);
      return;
    }
    const raw = viewport.toWorld(e);
    if (tool === 'select') {
      const corner = cornerDragRef.current;
      if (corner) {
        moveCorner(corner.wallAId, corner.wallBId, raw.x, raw.z);
        return;
      }
      const drag = dragRef.current;
      if (drag) moveWall(drag.id, snap(drag.horizontal ? raw.z : raw.x));
      return;
    }
    const target = drawTarget(raw);
    draw.hover(
      target.point,
      target.guide,
      tool === 'exterior' && draft.length >= 4 && dist(raw, draft[0]) <= CLOSE_RADIUS,
    );
    // Record the aimed edge so the length box can size it exactly. The direction
    // is axis-locked (from drawTarget), so it is purely along x or z.
    const last = draft[draft.length - 1];
    if (last && !pointsEqual(target.point, last)) {
      const dx = target.point.x - last.x;
      const dz = target.point.z - last.z;
      const len = Math.hypot(dx, dz);
      setPending({ dir: { x: dx / len, z: dz / len }, len });
    }
  };

  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    viewport.removePointer(e.pointerId);
    if (viewport.pointerCount() < 2) viewport.resetPinch();
    if (dragRef.current) useHistoryStore.getState().endBatch();
    dragRef.current = null;
    if (cornerDragRef.current) {
      useHistoryStore.getState().endBatch();
      cornerDragRef.current = null;
      setActiveWallIds([]);
    }
    // End of a drawing gesture: place the corner at the release point, or seal
    // the outline if released on the start corner. Every corner — including the
    // first — commits here on release, never on press, so a press-drag-release
    // lands the corner where the live measurement reads right. A plain tap is a
    // zero-length drag that places one corner. Using the release point makes
    // drawing work on touch, which has no hover to preview from.
    const gesture = drawGestureRef.current;
    if (gesture && gesture.pointerId === e.pointerId) {
      drawGestureRef.current = null;
      const raw = viewport.toWorld(e);
      if (tool === 'exterior' && draft.length >= 4 && dist(raw, draft[0]) <= CLOSE_RADIUS) {
        tryClose(draft);
      } else {
        draw.place(drawTarget(raw).point);
      }
      draw.clearHover();
    }
    const pan = viewport.endPan();
    if (pan && !pan.moved && pan.deselectOnTap) select(null);
  };

  // A cancelled pointer (e.g. the OS taking over) must not deselect on tap.
  const onPointerCancel = (e: React.PointerEvent<SVGSVGElement>) => {
    viewport.removePointer(e.pointerId);
    if (viewport.pointerCount() < 2) viewport.resetPinch();
    if (dragRef.current) useHistoryStore.getState().endBatch();
    dragRef.current = null;
    if (cornerDragRef.current) {
      useHistoryStore.getState().endBatch();
      cornerDragRef.current = null;
      setActiveWallIds([]);
    }
    drawGestureRef.current = null;
    viewport.cancelPan();
  };

  // Esc cancels the drawing in progress, Enter/double-click ends the interior wall chain.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Undo/redo are handled globally in App; don't also treat Ctrl+Z as a cancel.
      if (e.ctrlKey || e.metaKey) return;
      // Enter/Esc while typing in a field (e.g. the length box) belong to that
      // field, not to finishing/cancelling the draw.
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.isContentEditable)) return;
      if (e.key === 'Escape' && (draft.length > 0 || tool !== 'select')) {
        draw.committed();
      } else if (e.key === 'Enter' && tool === 'interior') {
        finishInterior();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [draft.length, tool, draw, finishInterior]);

  const startExterior = async () => {
    if (walls.some((w) => w.kind === 'exterior')) {
      const ok = await confirmDialog({
        title: 'Redraw exterior walls',
        message:
          'If you redraw the exterior walls, doors and windows on the current ' +
          'exterior walls will be removed once the new outline is complete. Continue?',
        confirmLabel: 'Redraw',
        danger: true,
      });
      if (!ok) return;
    }
    select(null);
    draw.setTool('exterior');
  };

  const startInterior = () => {
    select(null);
    draw.setTool('interior');
  };

  const startSelect = () => draw.setTool('select');

  const selectedWall =
    selection?.kind === 'wall' ? walls.find((w) => w.id === selection.id) : undefined;

  const onDone = () => {
    draw.setTool('select');
    backToLobby();
  };

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
        onPointerLeave={draw.clearHover}
        onDoubleClick={() => tool === 'interior' && finishInterior()}
      >
        <PlanGrid bounds={bounds} />
        <PlanWalls
          dimExterior={tool === 'exterior'}
          selectedWallId={selection?.kind === 'wall' ? selection.id : null}
          highlightWallIds={activeWallIds}
          onWallPointerDown={onWallPointerDown}
        />
        {tool === 'select' && (
          <PlanCorners coarse={coarse} onCornerPointerDown={onCornerPointerDown} />
        )}
        {tool !== 'select' && (
          <PlanDraft draft={draft} hover={hover} guide={guide} closable={closable} />
        )}
      </svg>

      {/* Top-left circular back button — the same compact control as the 3D view. */}
      <div className="plan-topbar">
        <button
          type="button"
          className="room-back"
          onClick={onDone}
          title="Done · back to your rooms"
          aria-label="Done · back to your rooms"
        >
          <span aria-hidden="true">
            <Icon name="arrow-left" />
          </span>
        </button>
      </div>

      {/* Room + wall property editors float clear of the canvas: ceiling height as
          a compact top-right chip, the selected wall's fields as a sheet above the
          dock — so the drawing stays visible, unlike the old full-width top panel. */}
      {tool === 'select' && <PlanRoomPanel />}
      {tool === 'select' && <PlanWallPanel />}

      {/* While drawing an edge, offer an exact-length box so the wall can be sized
          to the centimetre without waiting for the room to be closed. */}
      {tool !== 'select' && draft.length > 0 && pending && (
        <PlanLengthInput
          lengthCm={Math.round(pending.len * 100)}
          onCommit={placeExactLength}
        />
      )}

      <PlanToolbar
        tool={tool}
        error={error}
        coarse={coarse}
        draftActive={draft.length > 0}
        hasExterior={walls.some((w) => w.kind === 'exterior')}
        canDelete={selectedWall?.kind === 'interior'}
        canResetView={viewport.isCustom}
        onSelectTool={startSelect}
        onExteriorTool={startExterior}
        onInteriorTool={startInterior}
        onResetView={viewport.reset}
        onZoomIn={viewport.zoomIn}
        onZoomOut={viewport.zoomOut}
        onFinishDraft={finishInterior}
        onCancelDraft={startSelect}
        onDelete={() => {
          if (selectedWall) {
            removeWall(selectedWall.id);
            select(null);
          }
        }}
      />
    </div>
  );
}
