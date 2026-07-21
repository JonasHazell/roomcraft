import { useEffect, useState } from 'react';
import { useAiStore } from '../../store/useAiStore';
import { useEscape } from '../../lib/useEscape';
import { Icon } from '../ui/Icon';

/**
 * The free-tier "you're out of AI generations" moment (#352). The server gates
 * `/api/proposals` on a lifetime cap for 'free'-plan accounts and returns a
 * distinct `{ error: 'limit' }` response when it's hit; `useAiStore` catches
 * that as `limitReached` instead of the generic `error`, and this dialog shows
 * a calm upgrade prompt in its place — built from the same `.modal`/`.btn-accent`
 * primitives as every other dialog (AuthDialog, DialogHost). "Upgrade" has no
 * real payment flow yet, just an honest "coming soon" — there is no checkout
 * to send the user to.
 */
export function UpgradeDialog() {
  const open = useAiStore((s) => s.limitReached);
  const message = useAiStore((s) => s.limitMessage);
  const dismiss = useAiStore((s) => s.dismissLimit);

  const [comingSoon, setComingSoon] = useState(false);

  // Reset the placeholder notice each time a fresh limit hit opens the dialog.
  useEffect(() => {
    if (open) setComingSoon(false);
  }, [open]);

  useEscape(dismiss, open);

  if (!open) return null;

  return (
    <div className="modal-backdrop" role="presentation" onClick={dismiss}>
      <div
        className="modal modal-sm"
        role="dialog"
        aria-modal="true"
        aria-label="Upgrade to Pro"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <span className="modal-title">You&rsquo;ve hit the free limit</span>
          <button type="button" className="btn-icon" aria-label="Close" onClick={dismiss}>
            <Icon name="x" />
          </button>
        </div>
        <div className="modal-body stack">
          <p className="modal-message">
            {message ?? "You've used all your free AI furnishing generations."}
          </p>
          {comingSoon && (
            <p className="hint">
              Upgrades aren&rsquo;t open yet — thanks for trying RoomCraft&rsquo;s free tier.
            </p>
          )}
        </div>
        <div className="modal-foot">
          <button type="button" className="btn" onClick={dismiss}>
            Maybe later
          </button>
          <button type="button" className="btn btn-accent" onClick={() => setComingSoon(true)}>
            Upgrade
          </button>
        </div>
      </div>
    </div>
  );
}
