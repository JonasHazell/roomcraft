import { useHistoryStore } from '../../store/useHistoryStore';
import { useUiStore } from '../../store/useUiStore';
import { Icon } from '../ui/Icon';

/**
 * Standalone undo/redo pill for the 3D furnish view. It sits as its own pill on
 * the right of the bottom dock — separate from the add-furniture pill on the left
 * and the contextual selection pill in the middle — so history is always in the
 * same spot regardless of what is selected. Icon-only to stay compact. Keyboard
 * equivalents (Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z, Ctrl+Y) are handled in App.
 */
export function HistoryBar() {
  const appView = useUiStore((s) => s.appView);
  const canUndo = useHistoryStore((s) => s.canUndo);
  const canRedo = useHistoryStore((s) => s.canRedo);
  const undo = useHistoryStore((s) => s.undo);
  const redo = useHistoryStore((s) => s.redo);

  if (appView !== 'furnish') return null;

  return (
    <div className="selection-bar" role="toolbar" aria-label="History">
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
  );
}
