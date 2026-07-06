import type { PlanTool } from './PlanEditor';

interface Props {
  tool: PlanTool;
  error: string | null;
  /** Touch-first device: swaps in tap/pinch hints and shows on-screen draw controls. */
  coarse: boolean;
  /** True while an outline/interior chain is being drawn. */
  draftActive: boolean;
  canDelete: boolean;
  /** Explanation of why deletion is disabled; shown as a tooltip. */
  deleteDisabledReason?: string;
  /** True when the user has zoomed/panned away from the auto-fitted view. */
  canResetView: boolean;
  /** Leaves the floor-plan editor and returns to the 3D view. */
  onDone: () => void;
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
    'Click a wall to select it · drag perpendicular to move · scroll to zoom, drag on empty space to pan',
  exterior:
    'Click to place corners · click the start point to close · scroll to zoom, middle button pans · Esc cancels',
  interior:
    'Click to place wall points · Enter or double-click to finish · scroll to zoom, middle button pans · Esc cancels',
};

const TOUCH_HINTS: Record<PlanTool, string> = {
  select: 'Tap a wall to select it · drag it to move · drag empty space to pan · pinch to zoom',
  exterior: 'Tap to place corners · tap the start point to close · pinch to zoom · Cancel to abort',
  interior: 'Tap to place points · “Finish wall” ends the chain · pinch to zoom · Cancel to abort',
};

export function PlanToolbar({
  tool,
  error,
  coarse,
  draftActive,
  canDelete,
  deleteDisabledReason,
  canResetView,
  onDone,
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
  return (
    <div className="plan-toolbar">
      <div className="button-row">
        <button type="button" className="btn btn-done" onClick={onDone}>
          ✓ Done · 3D view
        </button>
        <button
          type="button"
          className={`btn ${tool === 'select' ? 'btn-accent' : ''}`}
          onClick={onSelectTool}
        >
          Select
        </button>
        <button
          type="button"
          className={`btn ${tool === 'exterior' ? 'btn-accent' : ''}`}
          onClick={onExteriorTool}
        >
          Redraw exterior walls…
        </button>
        <button
          type="button"
          className={`btn ${tool === 'interior' ? 'btn-accent' : ''}`}
          onClick={onInteriorTool}
        >
          Draw interior wall
        </button>
        {/* On-screen equivalents of the Enter/Esc shortcuts, essential on touch. */}
        {tool === 'interior' && draftActive && (
          <button type="button" className="btn btn-accent" onClick={onFinishDraft}>
            Finish wall
          </button>
        )}
        {tool !== 'select' && (
          <button type="button" className="btn" onClick={onCancelDraft}>
            Cancel
          </button>
        )}
      </div>
      <div className="button-row">
        {/* The wrapper carries the tooltip: disabled buttons don't receive hover events themselves. */}
        <span
          className="btn-tooltip-wrap"
          title={canDelete ? 'Delete the selected interior wall' : deleteDisabledReason}
        >
          <button type="button" className="btn" disabled={!canDelete} onClick={onDelete}>
            Delete wall
          </button>
        </span>
        <button type="button" className="btn btn-zoom" aria-label="Zoom out" onClick={onZoomOut}>
          −
        </button>
        <button type="button" className="btn btn-zoom" aria-label="Zoom in" onClick={onZoomIn}>
          +
        </button>
        <span
          className="btn-tooltip-wrap"
          title={
            canResetView
              ? 'Reset zoom and panning so the whole drawing is visible.'
              : 'The view already follows the drawing — scroll, pinch or drag to zoom and pan.'
          }
        >
          <button type="button" className="btn" disabled={!canResetView} onClick={onResetView}>
            Fit view
          </button>
        </span>
      </div>
      <p className="plan-hint">{(coarse ? TOUCH_HINTS : HINTS)[tool]}</p>
      {error && <p className="plan-error">{error}</p>}
    </div>
  );
}
