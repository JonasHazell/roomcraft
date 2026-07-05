import type { PlanTool } from './PlanEditor';

interface Props {
  tool: PlanTool;
  error: string | null;
  canDelete: boolean;
  /** Explanation of why deletion is disabled; shown as a tooltip. */
  deleteDisabledReason?: string;
  /** True when the user has zoomed/panned away from the auto-fitted view. */
  canResetView: boolean;
  onSelectTool: () => void;
  onExteriorTool: () => void;
  onInteriorTool: () => void;
  onDelete: () => void;
  onResetView: () => void;
}

const HINTS: Record<PlanTool, string> = {
  select:
    'Tap a wall to select it · drag perpendicular to move · pinch or scroll to zoom, drag empty space to pan',
  exterior:
    'Tap to place corners · tap the start point to close · pinch or scroll to zoom, two fingers pan · Esc cancels',
  interior:
    'Tap to place wall points · double-tap or Enter to finish · pinch or scroll to zoom, two fingers pan · Esc cancels',
};

export function PlanToolbar({
  tool,
  error,
  canDelete,
  deleteDisabledReason,
  canResetView,
  onSelectTool,
  onExteriorTool,
  onInteriorTool,
  onDelete,
  onResetView,
}: Props) {
  return (
    <div className="plan-toolbar">
      <div className="button-row">
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
        {/* The wrapper carries the tooltip: disabled buttons don't receive hover events themselves. */}
        <span
          className="btn-tooltip-wrap"
          title={canDelete ? 'Delete the selected interior wall' : deleteDisabledReason}
        >
          <button type="button" className="btn" disabled={!canDelete} onClick={onDelete}>
            Delete wall
          </button>
        </span>
        <span
          className="btn-tooltip-wrap"
          title={
            canResetView
              ? 'Reset zoom and panning so the whole drawing is visible.'
              : 'The view already follows the drawing — scroll or drag to zoom and pan.'
          }
        >
          <button type="button" className="btn" disabled={!canResetView} onClick={onResetView}>
            Fit view
          </button>
        </span>
      </div>
      <p className="plan-hint">{HINTS[tool]}</p>
      {error && <p className="plan-error">{error}</p>}
    </div>
  );
}
