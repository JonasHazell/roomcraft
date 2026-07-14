import { useState } from 'react';
import { useUiStore } from '../../store/useUiStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useDesignStore } from '../../store/useDesignStore';
import { SelBar, SelBarButton, SelBarDivider } from './SelBar';
import { Icon } from '../ui/Icon';

/**
 * The left-most pill in the 3D view's bottom dock: the room-wide actions that
 * stay available in every selection state — add a piece, auto-arrange the current
 * furniture, and get AI furnishing suggestions. Keeping the AI entry here makes it
 * one tap from the furnishing view (it's also reachable from the proposal
 * switcher's menu), which matters on a phone where the switcher menu is three taps
 * deep. Auto-arrange sits beside it as the local, no-sign-in counterpart: it
 * reshuffles the pieces already in the room to raise the design score. When a
 * piece, wall or floor is selected its contextual bar sits in the middle of the
 * dock and the standalone undo/redo pill sits on the right (see the wrap in App).
 * Validation is automatic now and surfaced by the top-right score badge, not a
 * button here.
 */
export function ActionBar() {
  const appView = useUiStore((s) => s.appView);
  const openAddFurniture = useUiStore((s) => s.openAddFurniture);
  const openPanel = useUiStore((s) => s.openPanel);
  const panel = useUiStore((s) => s.panel);
  const select = useUiStore((s) => s.select);
  const openAuthDialog = useUiStore((s) => s.openAuthDialog);
  const autoArrange = useDesignStore((s) => s.autoArrange);
  // AI furnishing runs on the owner's Claude login, so when the server has
  // sign-in configured it's gated behind an account (same rule as the switcher).
  const authEnabled = useAuthStore((s) => s.enabled);
  const signedIn = useAuthStore((s) => s.user !== null);

  // The auto-arrange search is a short synchronous burst; the busy flag both
  // guards against a double-tap and shows the pill as pressed while it runs.
  const [arranging, setArranging] = useState(false);

  if (appView !== 'furnish') return null;

  const openAi = () => {
    select(null);
    if (authEnabled && !signedIn) {
      openAuthDialog();
      return;
    }
    openPanel('ai');
  };

  const runAutoArrange = () => {
    if (arranging) return;
    select(null);
    setArranging(true);
    // Defer past this render so the pressed state paints before the search blocks
    // the main thread for its (brief) run, then settle back when it's done.
    setTimeout(() => {
      try {
        autoArrange();
      } finally {
        setArranging(false);
      }
    }, 16);
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
        icon={<Icon name="scan" />}
        label="Auto"
        title="Rearrange the current furniture to raise the design score (no AI)"
        ariaLabel="Auto-arrange furniture to maximise the design score"
        active={arranging}
        onClick={runAutoArrange}
      />
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
