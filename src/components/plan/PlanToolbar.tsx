import { useHistoryStore } from '../../store/useHistoryStore';
import { Icon } from '../ui/Icon';
import type { PlanTool } from './PlanEditor';

interface Props {
  tool: PlanTool;
  error: string | null;
  /** Touch-first device: swaps in tap/pinch hints and hides the mouse-only zoom buttons. */
  coarse: boolean;
  /** True while an outline/interior chain is being drawn. */
  draftActive: boolean;
  /** Whether the room already has exterior walls — switches Draw ↔ Redraw wording. */
  hasExterior: boolean;
  canDelete: boolean;
  /** True when the user has zoomed/panned away from the auto-fitted view. */
  canResetView: boolean;
  onSelectTool: () => void;
  onExteriorTool: () => void;
  onInteriorTool: () => void;
  onDelete: () => void;
  onResetView: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  /** Ends the current interior-wall chain (keyboard equivalent: Enter). */
  onFinishDraft: () => void;
  /** Aborts the drawing and returns to Select (keyboard equivalent: Esc). */
  onCancelDraft: () => void;
}

const HINTS: Record<PlanTool, string> = {
  select:
    'Click a wall to select it and type its exact length · drag perpendicular to move · scroll to zoom, drag on empty space to pan',
  exterior:
    'Press, drag out the wall, release to place a corner — or type an exact length + Enter · click a drawn edge to retype its length · release on the start point to close · Esc cancels',
  interior:
    'Press, drag out the wall, release to place a point — or type an exact length + Enter · click a drawn edge to retype its length · Enter or double-click to finish · Esc cancels',
};

const TOUCH_HINTS: Record<PlanTool, string> = {
  select: 'Tap a wall to select it and type its exact length · drag it to move · drag empty space to pan · pinch to zoom',
  exterior: 'Press, drag out the wall, release to drop a corner — or type an exact length + Enter · tap a drawn edge to retype its length · release on the start point to close',
  interior: 'Press, drag out the wall, release to drop a point — or type an exact length + Enter · tap a drawn edge to retype its length · “Finish” ends the chain',
};

/**
 * Floating controls for the floor-plan editor, laid out like the 3D view: the
 * canvas stays full-bleed and the tools live in a bottom pill dock (view controls
 * left, mode + contextual actions centre, undo/redo right) so the drawing is never
 * covered. A guidance pill appears at the top only while drawing — select mode
 * stays clean, the interactions discoverable by direct manipulation as in 3D.
 */
export function PlanToolbar({
  tool,
  error,
  coarse,
  draftActive,
  hasExterior,
  canDelete,
  canResetView,
  onSelectTool,
  onExteriorTool,
  onInteriorTool,
  onDelete,
  onResetView,
  onZoomIn,
  onZoomOut,
  onFinishDraft,
  onCancelDraft,
}: Props) {
  const canUndo = useHistoryStore((s) => s.canUndo);
  const canRedo = useHistoryStore((s) => s.canRedo);
  const undo = useHistoryStore((s) => s.undo);
  const redo = useHistoryStore((s) => s.redo);

  const drawing = tool !== 'select';
  const hint = (coarse ? TOUCH_HINTS : HINTS)[tool];

  return (
    <>
      {drawing && <p className="plan-hint-pill">{hint}</p>}
      {error && (
        <p className="plan-error-pill" role="alert">
          {error}
        </p>
      )}

      <div className="plan-dock" role="toolbar" aria-label="Floor plan tools">
        {/* Left: view controls. Touch relies on pinch/drag (as in the 3D view), so
            the +/− buttons are mouse-only; Fit view is always offered. Redrawing the
            whole outline is a rare, start-over action, so it sits here off to the
            side as a small icon button rather than central among the mode switches. */}
        <div className="dock-slot dock-left">
          <div className="selection-bar">
            {!coarse && (
              <>
                <button
                  type="button"
                  className="sel-action sel-history"
                  onClick={onZoomOut}
                  title="Zoom out"
                  aria-label="Zoom out"
                >
                  <span className="sel-icon" aria-hidden="true">
                    <Icon name="minus" />
                  </span>
                </button>
                <button
                  type="button"
                  className="sel-action sel-history"
                  onClick={onZoomIn}
                  title="Zoom in"
                  aria-label="Zoom in"
                >
                  <span className="sel-icon" aria-hidden="true">
                    <Icon name="plus" />
                  </span>
                </button>
              </>
            )}
            <button
              type="button"
              className="sel-action sel-history"
              onClick={onResetView}
              disabled={!canResetView}
              title="Fit the whole drawing in view"
              aria-label="Fit view"
            >
              <span className="sel-icon" aria-hidden="true">
                <Icon name="scan" />
              </span>
            </button>
            {!drawing && hasExterior && (
              <>
                <span className="sel-divider" aria-hidden="true" />
                <button
                  type="button"
                  className="sel-action sel-history"
                  onClick={onExteriorTool}
                  title="Redraw exterior walls (start the outline over)"
                  aria-label="Redraw exterior walls"
                >
                  <span className="sel-icon" aria-hidden="true">
                    <Icon name="pencil" />
                  </span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Centre: while drawing, the finish/cancel actions; otherwise the mode
            switches plus a Delete action when an interior wall is selected. */}
        <div className="dock-slot dock-mid">
          {drawing ? (
            <div className="selection-bar">
              {tool === 'interior' && draftActive && (
                <button
                  type="button"
                  className="sel-action sel-active"
                  onClick={onFinishDraft}
                  title="Finish wall"
                  aria-label="Finish wall"
                >
                  <span className="sel-icon" aria-hidden="true">
                    <Icon name="check" />
                  </span>
                  <span className="sel-label">Finish</span>
                </button>
              )}
              <button
                type="button"
                className="sel-action sel-danger"
                onClick={onCancelDraft}
                title="Cancel drawing"
                aria-label="Cancel drawing"
              >
                <span className="sel-icon" aria-hidden="true">
                  <Icon name="x" />
                </span>
                <span className="sel-label">Cancel</span>
              </button>
            </div>
          ) : (
            <div className="selection-bar">
              <button
                type="button"
                className={`sel-action${tool === 'select' ? ' sel-active' : ''}`}
                onClick={onSelectTool}
                title="Select and move walls"
                aria-label="Select"
              >
                <span className="sel-icon" aria-hidden="true">
                  <Icon name="mouse-pointer" />
                </span>
                <span className="sel-label">Select</span>
              </button>
              {/* Before an outline exists, drawing it is the primary task, so it
                  stays central. Once drawn, "Redraw" moves to the side dock. */}
              {!hasExterior && (
                <button
                  type="button"
                  className="sel-action"
                  onClick={onExteriorTool}
                  title="Draw exterior walls"
                  aria-label="Draw exterior walls"
                >
                  <span className="sel-icon" aria-hidden="true">
                    <Icon name="square" />
                  </span>
                  <span className="sel-label">Exterior</span>
                </button>
              )}
              <button
                type="button"
                className="sel-action"
                onClick={onInteriorTool}
                title="Draw interior wall"
                aria-label="Draw interior wall"
              >
                <span className="sel-icon" aria-hidden="true">
                  <Icon name="columns-2" />
                </span>
                <span className="sel-label">Interior</span>
              </button>
              {canDelete && (
                <>
                  <span className="sel-divider" aria-hidden="true" />
                  <button
                    type="button"
                    className="sel-action sel-danger"
                    onClick={onDelete}
                    title="Delete the selected interior wall"
                    aria-label="Delete wall"
                  >
                    <span className="sel-icon" aria-hidden="true">
                      <Icon name="trash-2" />
                    </span>
                    <span className="sel-label">Delete</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Right: undo/redo, in the same spot as the 3D view's history pill. */}
        <div className="dock-slot dock-right">
          <div className="selection-bar">
            <button
              type="button"
              className="sel-action sel-history"
              onClick={undo}
              disabled={!canUndo}
              title="Undo (Ctrl/Cmd+Z)"
              aria-label="Undo"
            >
              <span className="sel-icon" aria-hidden="true">
                <Icon name="undo-2" />
              </span>
            </button>
            <button
              type="button"
              className="sel-action sel-history"
              onClick={redo}
              disabled={!canRedo}
              title="Redo (Ctrl/Cmd+Shift+Z)"
              aria-label="Redo"
            >
              <span className="sel-icon" aria-hidden="true">
                <Icon name="redo-2" />
              </span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
