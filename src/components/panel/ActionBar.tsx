import { useUiStore } from '../../store/useUiStore';
import { SelBar, SelBarButton } from './SelBar';

/**
 * The primary action bar for the 3D view: the room-wide actions — add furniture —
 * plus the shared undo/redo segment, in one pill pinned to the bottom centre. It
 * stays visible in every selection state; when a piece, wall or floor is selected
 * its contextual bar floats just above this one (see BottomDock). Validation is
 * automatic now and surfaced by the top-right score badge, not a button here.
 */
export function ActionBar() {
  const appView = useUiStore((s) => s.appView);
  const openAddFurniture = useUiStore((s) => s.openAddFurniture);

  if (appView !== 'furnish') return null;

  return (
    <SelBar label="Room actions" keepLabels>
      <SelBarButton
        icon="＋"
        label="Furniture"
        title="Add a piece of furniture"
        ariaLabel="Add furniture"
        onClick={openAddFurniture}
      />
    </SelBar>
  );
}
