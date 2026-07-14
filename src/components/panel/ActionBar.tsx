import { useUiStore } from '../../store/useUiStore';
import { useAuthStore } from '../../store/useAuthStore';
import { SelBar, SelBarButton, SelBarDivider } from './SelBar';
import { Icon } from '../ui/Icon';

/**
 * The left-most pill in the 3D view's bottom dock: the room-wide actions that
 * stay available in every selection state — add a piece, and get AI furnishing
 * suggestions. Keeping the AI entry here makes it one tap from the furnishing
 * view (it's also reachable from the proposal switcher's menu), which matters on
 * a phone where the switcher menu is three taps deep. When a piece, wall or floor
 * is selected its contextual bar sits in the middle of the dock and the
 * standalone undo/redo pill sits on the right (see the wrap in App). Validation
 * is automatic now and surfaced by the top-right score badge, not a button here.
 */
export function ActionBar() {
  const appView = useUiStore((s) => s.appView);
  const openAddFurniture = useUiStore((s) => s.openAddFurniture);
  const openPanel = useUiStore((s) => s.openPanel);
  const panel = useUiStore((s) => s.panel);
  const select = useUiStore((s) => s.select);
  const openAuthDialog = useUiStore((s) => s.openAuthDialog);
  // AI furnishing runs on the owner's Claude login, so when the server has
  // sign-in configured it's gated behind an account (same rule as the switcher).
  const authEnabled = useAuthStore((s) => s.enabled);
  const signedIn = useAuthStore((s) => s.user !== null);

  if (appView !== 'furnish') return null;

  const openAi = () => {
    select(null);
    if (authEnabled && !signedIn) {
      openAuthDialog();
      return;
    }
    openPanel('ai');
  };

  return (
    <SelBar label="Room actions" keepLabels>
      <SelBarButton
        icon={<Icon name="plus" />}
        title="Add a piece of furniture"
        ariaLabel="Add furniture"
        onClick={openAddFurniture}
      />
      <SelBarDivider />
      <SelBarButton
        icon={<Icon name="star" />}
        label="AI"
        title="Get 3 AI furnishing suggestions"
        ariaLabel="AI furnishing suggestions"
        expandable
        active={panel === 'ai'}
        onClick={openAi}
      />
    </SelBar>
  );
}
