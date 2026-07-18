import { useHistoryStore } from '../../store/useHistoryStore';
import { SelBar, SelBarButton, SelBarDivider } from '../panel/SelBar';
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
  onSelectTool: () => void;
  onExteriorTool: () => void;
  onInteriorTool: () => void;
  onDelete: () => void;
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
  onSelectTool,
  onExteriorTool,
  onInteriorTool,
  onDelete,
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
  // The guidance pill speaks only while drawing; select mode reads as clean as
  // the 3D view, its interactions discoverable by direct manipulation.
  const hint: string | null = drawing ? (coarse ? TOUCH_HINTS : HINTS)[tool] : null;

  return (
    <>
      {hint && <p className="plan-hint-pill">{hint}</p>}
      {error && (
        <p className="plan-error-pill" role="alert">
          {error}
        </p>
      )}

      <div className="plan-dock" role="toolbar" aria-label="Floor plan tools">
        {/* Left: view controls. Touch relies on pinch/drag (as in the 3D view), so
            the +/− buttons are mouse-only. Redrawing the whole outline is a rare,
            start-over action, so it sits here off to the side as a small icon button
            rather than central among the mode switches. */}
        <div className="dock-slot dock-left">
          <SelBar label="View controls">
            {!coarse && (
              <>
                <SelBarButton
                  icon={<Icon name="minus" />}
                  title="Zoom out"
                  ariaLabel="Zoom out"
                  history
                  onClick={onZoomOut}
                />
                <SelBarButton
                  icon={<Icon name="plus" />}
                  title="Zoom in"
                  ariaLabel="Zoom in"
                  history
                  onClick={onZoomIn}
                />
              </>
            )}
            {!drawing && hasExterior && (
              <>
                <SelBarDivider />
                <SelBarButton
                  icon={<Icon name="pencil" />}
                  title="Redraw exterior walls (start the outline over)"
                  ariaLabel="Redraw exterior walls"
                  history
                  onClick={onExteriorTool}
                />
              </>
            )}
          </SelBar>
        </div>

        {/* Centre: while drawing, the finish/cancel actions; otherwise the mode
            switches plus a Delete action when an interior wall is selected. */}
        <div className="dock-slot dock-mid">
          {drawing ? (
            <SelBar label="Drawing actions">
              {tool === 'interior' && draftActive && (
                <SelBarButton
                  icon={<Icon name="check" />}
                  label="Finish"
                  title="Finish wall"
                  ariaLabel="Finish wall"
                  active
                  onClick={onFinishDraft}
                />
              )}
              <SelBarButton
                icon={<Icon name="x" />}
                label="Cancel"
                title="Cancel drawing"
                ariaLabel="Cancel drawing"
                danger
                onClick={onCancelDraft}
              />
            </SelBar>
          ) : (
            <SelBar label="Plan mode">
              <SelBarButton
                icon={<Icon name="mouse-pointer" />}
                label="Select"
                title="Select and move walls"
                ariaLabel="Select"
                active={tool === 'select'}
                onClick={onSelectTool}
              />
              {/* Before an outline exists, drawing it is the primary task, so it
                  stays central. Once drawn, "Redraw" moves to the side dock. */}
              {!hasExterior && (
                <SelBarButton
                  icon={<Icon name="square" />}
                  label="Exterior"
                  title="Draw exterior walls"
                  ariaLabel="Draw exterior walls"
                  onClick={onExteriorTool}
                />
              )}
              <SelBarButton
                icon={<Icon name="columns-2" />}
                label="Interior"
                title="Draw interior wall"
                ariaLabel="Draw interior wall"
                onClick={onInteriorTool}
              />
              {canDelete && (
                <>
                  <SelBarDivider />
                  <SelBarButton
                    icon={<Icon name="trash-2" />}
                    label="Delete"
                    title="Delete the selected interior wall"
                    ariaLabel="Delete wall"
                    danger
                    onClick={onDelete}
                  />
                </>
              )}
            </SelBar>
          )}
        </div>

        {/* Right: undo/redo, in the same spot as the 3D view's history pill. */}
        <div className="dock-slot dock-right">
          <SelBar label="History">
            <SelBarButton
              icon={<Icon name="undo-2" />}
              title="Undo (Ctrl/Cmd+Z)"
              ariaLabel="Undo"
              history
              disabled={!canUndo}
              onClick={undo}
            />
            <SelBarButton
              icon={<Icon name="redo-2" />}
              title="Redo (Ctrl/Cmd+Shift+Z)"
              ariaLabel="Redo"
              history
              disabled={!canRedo}
              onClick={redo}
            />
          </SelBar>
        </div>
      </div>
    </>
  );
}
