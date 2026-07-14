import { useAuthStore } from '../../store/useAuthStore';
import { useUiStore } from '../../store/useUiStore';

/**
 * The lobby's account control: a "Sign in" button when signed out, or the
 * current email plus "Sign out" when signed in. Renders nothing until the
 * session has been checked, and stays hidden when the server has no sign-in
 * configured (dev with no database), so the app looks unchanged there.
 */
export function AccountControl() {
  const status = useAuthStore((s) => s.status);
  const enabled = useAuthStore((s) => s.enabled);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const openAuthDialog = useUiStore((s) => s.openAuthDialog);

  if (status === 'loading' || !enabled) return null;

  if (!user) {
    return (
      <div className="lobby-account">
        <button type="button" className="btn btn-accent" onClick={openAuthDialog}>
          Sign in
        </button>
      </div>
    );
  }

  return (
    <div className="lobby-account">
      <span className="lobby-account-email" title={user.email}>
        {user.email}
      </span>
      <button type="button" className="btn" onClick={() => void logout()}>
        Sign out
      </button>
    </div>
  );
}
