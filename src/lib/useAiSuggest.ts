import { useUiStore } from '../store/useUiStore';
import { useAuthStore } from '../store/useAuthStore';

/**
 * The shared "Suggest 3 layouts" entry point: clears the current selection and
 * opens the AI furnishing panel — but first gates on sign-in exactly as the
 * proposal menu does. AI furnishing runs on the owner's Claude login, so when the
 * server has sign-in configured and the user isn't signed in, this opens the auth
 * dialog instead of the panel.
 *
 * Factored out so the proposal switcher's menu and the empty-room prompt (#325)
 * share one copy of the gating rather than each re-implementing it.
 */
export function useAiSuggest(): () => void {
  const select = useUiStore((s) => s.select);
  const openPanel = useUiStore((s) => s.openPanel);
  const openAuthDialog = useUiStore((s) => s.openAuthDialog);
  const authEnabled = useAuthStore((s) => s.enabled);
  const signedIn = useAuthStore((s) => s.user !== null);

  return () => {
    select(null);
    if (authEnabled && !signedIn) {
      openAuthDialog();
      return;
    }
    openPanel('ai');
  };
}
