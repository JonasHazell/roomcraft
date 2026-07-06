import { useHistoryStore } from '../../store/useHistoryStore';

/**
 * Floating undo/redo cluster pinned to the bottom-right corner of the viewport.
 * Always visible in both the 3D and floor-plan views so any editing step can be
 * reversed, and thumb-reachable on mobile. Keyboard equivalents (Ctrl/Cmd+Z,
 * Ctrl/Cmd+Shift+Z, Ctrl+Y) are handled in App.
 */
export function HistoryControls() {
  const canUndo = useHistoryStore((s) => s.canUndo);
  const canRedo = useHistoryStore((s) => s.canRedo);
  const undo = useHistoryStore((s) => s.undo);
  const redo = useHistoryStore((s) => s.redo);

  return (
    <div className="history-controls" role="toolbar" aria-label="History">
      <button
        type="button"
        className="history-btn"
        onClick={undo}
        disabled={!canUndo}
        title="Undo (Ctrl/Cmd+Z)"
        aria-label="Undo"
      >
        <span aria-hidden="true">↶</span>
      </button>
      <button
        type="button"
        className="history-btn"
        onClick={redo}
        disabled={!canRedo}
        title="Redo (Ctrl/Cmd+Shift+Z)"
        aria-label="Redo"
      >
        <span aria-hidden="true">↷</span>
      </button>
    </div>
  );
}
