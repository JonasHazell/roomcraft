import { useEffect, useMemo, useRef } from 'react';
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
import { PlanDraft } from './PlanDraft';
import { PlanToolbar } from './PlanToolbar';
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

  // The start tool is a one-shot handoff from the lobby; clear it once consumed
  // so re-entering an existing plan later opens in select mode.
  useEffect(() => {
    useUiStore.getState().setPlanStartTool('select');
  }, []);

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
      // Second finger down: abandon any in-progress pan/drag and start pinching.
      viewport.cancelPan();
      if (dragRef.current) useHistoryStore.getState().endBatch();
      dragRef.current = null;
      viewport.resetPinch();
      capture(e);
      return;
    }
    const raw = viewport.toWorld(e);
    if (tool === 'exterior') {
      if (draft.length >= 4 && dist(raw, draft[0]) <= CLOSE_RADIUS) tryClose(draft);
      else draw.appendExterior(drawTarget(raw).point);
    } else if (tool === 'interior') {
      const p = drawTarget(raw).point;
      const last = draft[draft.length - 1];
      if (!last) {
        draw.startChain(p);
      } else if (!pointsEqual(last, p)) {
        addInteriorWall(last, p);
        draw.startChain(p);
      }
    } else {
      // Select mode: dragging on empty space pans, a click without dragging
      // deselects on release (walls stop propagation).
      viewport.beginPan(e.clientX, e.clientY, bounds, true);
      capture(e);
    }
  };

  const onWallPointerDown = (id: string, e: React.PointerEvent) => {
    if (tool !== 'select' || e.button !== 0) return;
    e.stopPropagation();
    select({ kind: 'wall', id });
    const wall = walls.find((w) => w.id === id);
    if (!wall) return;
    dragRef.current = { id, horizontal: wall.a.z === wall.b.z };
    // Fold the whole wall drag into a single undo step.
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
  };

  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    viewport.removePointer(e.pointerId);
    if (viewport.pointerCount() < 2) viewport.resetPinch();
    if (dragRef.current) useHistoryStore.getState().endBatch();
    dragRef.current = null;
    const pan = viewport.endPan();
    if (pan && !pan.moved && pan.deselectOnTap) select(null);
  };

  // A cancelled pointer (e.g. the OS taking over) must not deselect on tap.
  const onPointerCancel = (e: React.PointerEvent<SVGSVGElement>) => {
    viewport.removePointer(e.pointerId);
    if (viewport.pointerCount() < 2) viewport.resetPinch();
    if (dragRef.current) useHistoryStore.getState().endBatch();
    dragRef.current = null;
    viewport.cancelPan();
  };

  // Esc cancels the drawing in progress, Enter/double-click ends the interior wall chain.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && (draft.length > 0 || tool !== 'select')) {
        draw.committed();
      } else if (e.key === 'Enter' && tool === 'interior') {
        draw.cancel();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [draft.length, tool, draw]);

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
        onDoubleClick={() => tool === 'interior' && draw.cancel()}
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
        onFinishDraft={draw.cancel}
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
