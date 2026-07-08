import { useUiStore } from '../../store/useUiStore';
import { SelBar, SelBarButton, SelBarDivider } from './SelBar';

/**
 * The primary action bar shown in the 3D view when nothing is selected. Groups
 * the room-wide actions — add furniture, validation — into one pill in the same
 * family as the selection bar, pinned to the bottom centre.
 */
export function ActionBar() {
  const appView = useUiStore((s) => s.appView);
  const selection = useUiStore((s) => s.selection);
  const openAddFurniture = useUiStore((s) => s.openAddFurniture);
  const openPanel = useUiStore((s) => s.openPanel);
  const panel = useUiStore((s) => s.panel);

  // Only the empty-selection state; furniture/wall/floor get their own bars.
  if (appView !== 'furnish' || selection !== null) return null;

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
