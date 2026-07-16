import { useUiStore } from '../../store/useUiStore';
import { SelBar, SelBarButton } from './SelBar';
import { Icon } from '../ui/Icon';

/**
 * The left-most pill in the 3D view's bottom dock: room-wide actions that stay
 * available in every selection state. Auto-arrange and AI furnishing suggestions
 * used to live here too, but a three-button pill *with text labels* competed for
 * width with the middle dock slot's contextual bar on narrow phones and could
 * overlap it, stealing its taps (#170). Both actions now live in the proposal
 * switcher's menu instead (`ProposalSwitcher.tsx`), which already had the AI
 * entry point.
 *
 * "Reset view" (#224) adds a second icon-only button here — neither button ever
 * passes a `label`, so no text is ever shown. That's also why this `<SelBar>`
 * deliberately does NOT pass `keepLabels` (unlike when this pill had a single
 * button): `keepLabels` only exists to keep a short bar's text legible on narrow
 * phones, but it has a side effect — `index.css`'s narrow-viewport rules that
 * shrink `.sel-action` padding (656px/430px/400px) explicitly skip
 * `.selection-bar-keep-labels` bars. With two buttons and no shrink, this pill
 * measured 110px wide at 390px — 28px over its share of the dock — and
 * overlapped the middle slot exactly like #170. Dropping `keepLabels` (a no-op
 * for text, since there isn't any) lets it shrink like `HistoryBar`'s pill does,
 * back to 82px — confirmed clear of the middle slot down to the 390px viewport
 * `e2e/bottom-dock.spec.ts` checks. When a piece, wall or floor is selected its
 * contextual bar sits in the middle of the dock and the standalone undo/redo
 * pill sits on the right (see the wrap in App). Validation is automatic now and
 * surfaced by the top-right score badge, not a button here.
 */
export function ActionBar() {
  const appView = useUiStore((s) => s.appView);
  const openAddFurniture = useUiStore((s) => s.openAddFurniture);
  const cameraReset = useUiStore((s) => s.cameraReset);

  if (appView !== 'furnish') return null;

  return (
    <SelBar label="Room actions">
      <SelBarButton
        icon={<Icon name="plus" />}
        title="Add a piece of furniture"
        ariaLabel="Add furniture"
        onClick={openAddFurniture}
      />
      <SelBarButton
        icon={<Icon name="scan" />}
        title="Reset the camera to the room's starting view"
        ariaLabel="Reset view"
        onClick={() => cameraReset?.()}
      />
    </SelBar>
  );
}
