import { useHistoryStore } from '../../store/useHistoryStore';
import { useUiStore } from '../../store/useUiStore';
import { Icon } from '../ui/Icon';
import { SelBar, SelBarButton } from './SelBar';

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
    <SelBar label="History">
      <SelBarButton
        icon={<Icon name="undo-2" />}
        title="Undo (Ctrl/Cmd+Z)"
        ariaLabel="Undo"
        onClick={undo}
        disabled={!canUndo}
        history
      />
      <SelBarButton
        icon={<Icon name="redo-2" />}
        title="Redo (Ctrl/Cmd+Shift+Z)"
        ariaLabel="Redo"
        onClick={redo}
        disabled={!canRedo}
        history
      />
    </SelBar>
  );
}
