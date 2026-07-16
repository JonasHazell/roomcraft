import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Point } from '../../types';
import {
  dist,
  drawSnap,
  pointsEqual,
  polygonBounds,
  snap,
  snapPoint,
  type Bounds,
} from '../../lib/polygon';
import { useDesignStore } from '../../store/useDesignStore';
import { useUiStore } from '../../store/useUiStore';
import { useHistoryStore } from '../../store/useHistoryStore';
import { confirmDialog } from '../../store/useDialogStore';
import { backToLobby, openRoomToFurnish } from '../../lib/nav';
import { COARSE_POINTER, useMediaQuery } from '../../lib/useMediaQuery';
import { PlanGrid } from './PlanGrid';
import { PlanWalls } from './PlanWalls';
import { PlanCorners } from './PlanCorners';
import { PlanDraft } from './PlanDraft';
import { PlanToolbar } from './PlanToolbar';
import { PlanLengthInput } from './PlanLengthInput';
import { PlanWallPanel } from './PlanWallPanel';
import { PlanRoomPanel } from './PlanRoomPanel';
import { PlanStartChooser } from './PlanStartChooser';
import { Icon } from '../ui/Icon';
import { useViewport } from './useViewport';
import { usePlanDraft, type PlanTool } from './usePlanDraft';

export type { PlanTool } from './usePlanDraft';

/** Clicks within this radius of the start point close the outline. */
const CLOSE_RADIUS = 0.25;
const PAD = 2;

/**
 * The 2D floor-plan editor. Used standalone (from the lobby's "Edit plan") and,
 * when `wizardStep` is set, as the two floor-plan steps of the new-room wizard —
 * in which case the wizard chrome supplies navigation, so the editor drops its
 * own back button and centre mode-switcher and locks the tool to the step:
 * `walls` draws the outline (offering the shape chooser first), `openings`
 * selects walls to fit doors, windows and the ceiling height.
 */
export function PlanEditor({ wizardStep }: { wizardStep?: 'walls' | 'openings' } = {}) {
  const walls = useDesignStore((s) => s.design.walls);
  const hasExterior = walls.some((w) => w.kind === 'exterior');
  const commitExteriorPolygon = useDesignStore((s) => s.commitExteriorPolygon);
  const addInteriorWall = useDesignStore((s) => s.addInteriorWall);
  const moveWall = useDesignStore((s) => s.moveWall);
  const moveCorner = useDesignStore((s) => s.moveCorner);
  const removeWall = useDesignStore((s) => s.removeWall);
  const selection = useUiStore((s) => s.selection);
  const select = useUiStore((s) => s.select);

  const svgRef = useRef<SVGSVGElement>(null);
  // The selected-wall sheet floats over the bottom of the canvas; its measured
  // reach is fed back to the viewport so the auto-fit lifts the drawing clear of
  // it, instead of the sheet hiding the very wall being edited.
  const wallPanelRef = useRef<HTMLDivElement>(null);
  const [panelInset, setPanelInset] = useState(0);
  const coarse = useMediaQuery(COARSE_POINTER);
  // A new room opens with the exterior tool armed so the user draws its outline
  // right away; editing an existing plan opens in select mode. Inside the wizard
  // the tool is fixed by the step: draw walls, or select them to fit openings.
  const initialTool: PlanTool =
    wizardStep === 'openings'
      ? 'select'
      : wizardStep === 'walls'
        ? // Re-entering the walls step with an outline already drawn opens in
          // select mode; a still-empty room arms the exterior tool to draw.
          useDesignStore.getState().design.walls.some((w) => w.kind === 'exterior')
          ? 'select'
          : 'exterior'
        : useUiStore.getState().planStartTool;
  const draw = usePlanDraft(initialTool);
  const { tool, draft, hover, guide, closable, selectedEdge, error } = draw.state;
  // Whether the user has left the wizard's shape chooser to draw by hand. The
  // chooser only shows while a wall-step room is still empty; drawing or picking
  // a template dismisses it.
  const [drawSelfChosen, setDrawSelfChosen] = useState(false);
  // A wall being dragged in select mode (domain drag, distinct from viewport pan).
  const dragRef = useRef<{ id: string; horizontal: boolean } | null>(null);
  // A corner (shared point of two exterior walls) being dragged in select mode.
  const cornerDragRef = useRef<{ wallAId: string; wallBId: string } | null>(null);
  // The wall set to auto-fit against while a wall/corner drag is in progress —
  // a snapshot taken at the start of the drag, not the live (actively-changing)
  // geometry. See `fitBounds` below for why.
  const dragFitWallsRef = useRef<typeof walls | null>(null);
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

  // Keep the latest draft controls reachable from effects that must fire only on
  // a wizard step change (not on every draw tick), without listing `draw` — whose
  // identity changes each keystroke — as a dependency.
  const drawRef = useRef(draw);
  drawRef.current = draw;

  // Lock the tool to the wizard step: the openings step selects walls; the walls
  // step draws (or, once an outline exists, selects so it can be nudged).
  useEffect(() => {
    if (!wizardStep) return;
    if (wizardStep === 'openings') {
      select(null);
      drawRef.current.setTool('select');
    } else {
      const drawn = useDesignStore.getState().design.walls.some((w) => w.kind === 'exterior');
      drawRef.current.setTool(drawn ? 'select' : 'exterior');
    }
  }, [wizardStep, select]);

  // In the walls step, dropping back to select mode with nothing drawn (Esc, or
  // cancelling a draft) returns to the shape chooser rather than a blank canvas.
  useEffect(() => {
    if (wizardStep === 'walls' && !hasExterior && tool === 'select') setDrawSelfChosen(false);
  }, [wizardStep, hasExterior, tool]);

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
  //
  // The same principle applies to a wall/corner drag in select mode: while one
  // is in progress, `dragFitWallsRef` holds the geometry as it was when the
  // drag started, so the fit — and therefore the viewBox and every `toWorld`
  // conversion drawn from it — stays fixed for the whole gesture instead of
  // rescaling on every intermediate move. Without this, dragging a corner
  // outward grows the fit bounds, which zooms the view out, which makes the
  // very next pointermove (at the same screen position) resolve to an even
  // larger world delta — a feedback loop that runs away over a single drag
  // (issue #196).
  const fitBounds: Bounds = useMemo(() => {
    const source = dragFitWallsRef.current ?? walls;
    const pts = source.flatMap((w) => [w.a, w.b]);
    if (pts.length === 0) return { minX: -5, maxX: 5, minZ: -5, maxZ: 5 };
    const b = polygonBounds(pts);
    return { minX: b.minX - PAD, maxX: b.maxX + PAD, minZ: b.minZ - PAD, maxZ: b.maxZ + PAD };
  }, [walls]);

  // Reserve the sheet's footprint (plus a little top chrome) only while it's open,
  // so the room recentres into the free band above it and snaps back when it closes.
  const viewport = useViewport(svgRef, fitBounds, {
    top: panelInset > 0 ? 56 : 0,
    bottom: panelInset,
  });
  const bounds = viewport.bounds;

  // Track how far up the canvas the selected-wall sheet reaches, so the auto-fit
  // can keep the drawing above it. Re-runs when the sheet appears/disappears; the
  // ResizeObserver also catches it growing as openings are added or expanded.
  useEffect(() => {
    const svg = svgRef.current;
    const panel = wallPanelRef.current;
    if (!svg || !panel) {
      setPanelInset(0);
      return;
    }
    const measure = () => {
      const s = svg.getBoundingClientRect();
      const p = panel.getBoundingClientRect();
      setPanelInset(Math.max(0, s.bottom - p.top + 8));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(panel);
    ro.observe(svg);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [tool, selection]);

  /**
   * Snapped, axis-locked cursor position. The coordinate the wall shares with the
   * previous corner is kept exact (so a wall drawn from an exact-length, off-grid
   * corner stays attached to it); the free coordinate snaps to already-placed
   * corners so the outline lines up with itself, else to the grid.
   */
  const drawTarget = (raw: Point): { point: Point; guide: Point | null } => {
    const last = draft[draft.length - 1];
    if (!last) return { point: snapPoint(raw), guide: null };
    return drawSnap(last, raw, draft.slice(0, -1));
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
      dragFitWallsRef.current = null;
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
    // Freeze the auto-fit to the geometry as it is now — see `fitBounds`.
    dragFitWallsRef.current = walls;
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
    // Freeze the auto-fit to the geometry as it is now — see `fitBounds`.
    dragFitWallsRef.current = walls;
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
    // Release the frozen auto-fit — the view re-fits to the settled geometry.
    dragFitWallsRef.current = null;
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
    dragFitWallsRef.current = null;
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
      if (e.key === 'Escape' && selectedEdge !== null) {
        // A picked edge is released first, so the draw isn't cancelled outright.
        draw.selectEdge(null);
      } else if (e.key === 'Escape' && (draft.length > 0 || tool !== 'select')) {
        draw.committed();
      } else if (e.key === 'Enter' && tool === 'interior') {
        finishInterior();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [draft.length, tool, selectedEdge, draw, finishInterior]);

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

  // Wizard shape chooser: a template fills the outline straight in; "draw it
  // yourself" arms the exterior tool on a blank canvas.
  const chooserPick = (points: Point[]) => {
    if (commitExteriorPolygon(points).ok) draw.setTool('select');
  };
  const chooserDraw = () => {
    setDrawSelfChosen(true);
    draw.setTool('exterior');
  };
  const showChooser = wizardStep === 'walls' && !hasExterior && !drawSelfChosen;

  const selectedWall =
    selection?.kind === 'wall' ? walls.find((w) => w.id === selection.id) : undefined;

  const onDone = () => {
    draw.setTool('select');
    backToLobby();
  };

  // A second, explicit way out of the plan editor: jump straight into
  // furnishing this same room instead of round-tripping through the lobby.
  // Reuses the exact transition the lobby's own room card and the wizard's
  // finish step use (`openRoomToFurnish`) rather than a parallel path — see
  // `lib/nav.ts`. Kept as its own visible button (not a second meaning on
  // "Done") per the #127 lesson: a control must not branch on state the user
  // can't see.
  const onFurnish = () => {
    draw.setTool('select');
    openRoomToFurnish(useDesignStore.getState().design.id);
  };

  return (
    <div className={`plan-editor${wizardStep === 'openings' ? ' plan-wizard-openings' : ''}`}>
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
          <PlanDraft
            draft={draft}
            hover={hover}
            guide={guide}
            closable={closable}
            selectedEdge={selectedEdge}
            onSelectEdge={draw.selectEdge}
          />
        )}
      </svg>

      {/* Top-left controls: the circular back button — the same compact control as
          the 3D view — plus a second, explicit "Furnish this room" action so a quick
          wall tweak doesn't require a detour through the lobby. Two distinct, always-
          visible buttons rather than one control that branches on hidden state (#127).
          Inside the wizard, navigation lives in the wizard footer, so both are dropped. */}
      {!wizardStep && (
        <div className="plan-topbar">
          <button
            type="button"
            className="btn room-back"
            onClick={onDone}
            title="Done · back to your rooms"
            aria-label="Done · back to your rooms"
          >
            <span aria-hidden="true">
              <Icon name="arrow-left" />
            </span>
          </button>
          <button
            type="button"
            className="btn btn-accent plan-furnish-btn"
            onClick={onFurnish}
            title="Furnish this room in 3D"
            aria-label="Furnish this room"
          >
            <Icon name="square" />
            <span>Furnish this room</span>
          </button>
        </div>
      )}

      {/* Room + wall property editors float clear of the canvas: ceiling height as
          a compact top-right chip, the selected wall's fields as a sheet above the
          dock — so the drawing stays visible, unlike the old full-width top panel.
          In the wizard, ceiling height belongs to the openings step; the walls step
          keeps the wall sheet to length-only (no door/window editor). */}
      {tool === 'select' && wizardStep !== 'walls' && <PlanRoomPanel />}
      {tool === 'select' && (
        <PlanWallPanel ref={wallPanelRef} openings={wizardStep !== 'walls'} />
      )}

      {showChooser && <PlanStartChooser onPick={chooserPick} onDraw={chooserDraw} />}

      {/* While drawing, offer an exact-length box so a wall can be sized to the
          centimetre without waiting for the room to be closed. When a placed edge
          is picked it edits that edge's length; otherwise it sizes the edge being
          aimed and places the next corner. */}
      {tool !== 'select' && selectedEdge !== null && draft[selectedEdge] && draft[selectedEdge + 1] ? (
        <PlanLengthInput
          key={`edge-${selectedEdge}`}
          label="Edge"
          autoFocus
          commitOnBlur
          lengthCm={Math.round(dist(draft[selectedEdge], draft[selectedEdge + 1]) * 100)}
          onCommit={(cm) => draw.resizeEdge(selectedEdge, cm / 100)}
        />
      ) : (
        tool !== 'select' &&
        draft.length > 0 &&
        pending && (
          <PlanLengthInput lengthCm={Math.round(pending.len * 100)} onCommit={placeExactLength} />
        )
      )}

      <PlanToolbar
        tool={tool}
        error={error}
        coarse={coarse}
        wizardStep={wizardStep}
        draftActive={draft.length > 0}
        hasExterior={hasExterior}
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
