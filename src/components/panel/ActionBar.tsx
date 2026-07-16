import { useUiStore } from '../../store/useUiStore';
import { SelBar, SelBarButton } from './SelBar';
import { Icon } from '../ui/Icon';

/**
 * The left-most pill in the 3D view's bottom dock: the one room-wide action that
 * stays available in every selection state — add a piece of furniture. Auto-arrange
 * and AI furnishing suggestions used to live here too, but a three-button pill
 * competed for width with the middle dock slot's contextual bar on narrow phones
 * and could overlap it, stealing its taps (#170). Both actions now live in the
 * proposal switcher's menu instead (`ProposalSwitcher.tsx`), which already had the
 * AI entry point — keeping only "Add furniture" here keeps this pill down to a
 * single button so it can never grow wide enough to collide again. When a piece,
 * wall or floor is selected its contextual bar sits in the middle of the dock and
 * the standalone undo/redo pill sits on the right (see the wrap in App). Validation
 * is automatic now and surfaced by the top-right score badge, not a button here.
 *
 * The keyboard-shortcuts reference (#227) deliberately does NOT live here: at the
 * narrow end of the supported range (390px, the #170 repro width) this pill and
 * the standalone undo/redo pill already consume their entire 1fr grid track with
 * nothing spare — measured with nothing selected, "Add furniture" alone is 110px
 * short of the mid slot's edge with the widest contextual bar showing. A second
 * icon here would reopen exactly the #170 overlap even though it's icon-only, so
 * the shortcuts trigger lives in the room top bar instead (see App.tsx), which has
 * ~67-75px of genuine slack on both sides of the proposal switcher at that width.
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
