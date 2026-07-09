import { useUiStore } from '../../store/useUiStore';
import { SelBar, SelBarButton, SelBarDivider } from './SelBar';

/**
 * The primary action bar for the 3D view: the room-wide actions — add furniture,
 * validation — plus the shared undo/redo segment, in one pill pinned to the bottom
 * centre. It stays visible in every selection state; when a piece, wall or floor
 * is selected its contextual bar floats just above this one (see BottomDock).
 */
export function ActionBar() {
  const appView = useUiStore((s) => s.appView);
  const openAddFurniture = useUiStore((s) => s.openAddFurniture);
  const openPanel = useUiStore((s) => s.openPanel);
  const panel = useUiStore((s) => s.panel);

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
      <SelBarDivider />
      <SelBarButton
        icon="✓"
        label="Validate"
        title="Check the furnishing against the rule catalog"
        ariaLabel="Validate"
        expandable
        active={panel === 'validation'}
        onClick={() => openPanel('validation')}
      />
    </SelBar>
  );
}
