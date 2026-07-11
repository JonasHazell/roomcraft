import { useUiStore } from '../../store/useUiStore';
import { SelBar, SelBarButton } from './SelBar';
import { Icon } from '../ui/Icon';

/**
 * The add-furniture pill for the 3D view: the left-most pill in the bottom dock,
 * holding the room-wide "add a piece" action. It stays visible in every selection
 * state; when a piece, wall or floor is selected its contextual bar sits in the
 * middle of the dock and the standalone undo/redo pill sits on the right (see the
 * wrap in App). Validation is automatic now and surfaced by the top-right score
 * badge, not a button here.
 */
export function ActionBar() {
  const appView = useUiStore((s) => s.appView);
  const openAddFurniture = useUiStore((s) => s.openAddFurniture);

  if (appView !== 'furnish') return null;

  return (
    <SelBar label="Room actions" keepLabels>
      <SelBarButton
        icon={<Icon name="plus" />}
        title="Add a piece of furniture"
        ariaLabel="Add furniture"
        onClick={openAddFurniture}
      />
    </SelBar>
  );
}
