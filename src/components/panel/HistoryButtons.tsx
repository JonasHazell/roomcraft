import { useHistoryStore } from '../../store/useHistoryStore';
import { SelBarDivider } from './SelBar';

/**
 * Undo/redo pair rendered as a trailing segment inside the bottom pill bars
 * (Action/Selection/Wall/Floor). Keeping history in the same bar as the
 * contextual actions means one unified bottom dock in every state, instead of a
 * separate floating cluster in its own shape. Icon-only so it stays compact even
 * behind the five-action furniture bar. Keyboard equivalents (Ctrl/Cmd+Z,
 * Ctrl/Cmd+Shift+Z, Ctrl+Y) are handled in App.
 */
export function HistoryButtons() {
  const canUndo = useHistoryStore((s) => s.canUndo);
  const canRedo = useHistoryStore((s) => s.canRedo);
  const undo = useHistoryStore((s) => s.undo);
  const redo = useHistoryStore((s) => s.redo);

  return (
    <>
      <SelBarDivider />
      <button
        type="button"
        className="sel-action sel-history"
        onClick={undo}
        disabled={!canUndo}
        title="Undo (Ctrl/Cmd+Z)"
        aria-label="Undo"
      >
        <span className="sel-icon" aria-hidden="true">
          ↶
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
          ↷
        </span>
      </button>
    </>
  );
}
