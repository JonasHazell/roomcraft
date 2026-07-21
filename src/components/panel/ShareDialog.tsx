import { useEffect, useState } from 'react';
import { useShareStore } from '../../store/useShareStore';
import { useEscape } from '../../lib/useEscape';
import { Icon } from '../ui/Icon';

/**
 * The result of "Share" (#353, triggered from `ProposalSwitcher`'s menu): shows
 * the read-only link once the server has stored the snapshot, with a one-tap
 * copy — built from the same `.modal`/`.field-input`/`.btn-accent` primitives as
 * every other dialog (compare `UpgradeDialog`). The link opens the shared,
 * furniture-only viewer at `#share/:id` (`components/share/ShareView.tsx`).
 */
export function ShareDialog() {
  const status = useShareStore((s) => s.status);
  const url = useShareStore((s) => s.url);
  const error = useShareStore((s) => s.error);
  const dismiss = useShareStore((s) => s.dismiss);

  // A transient "Copied!" confirmation, reset whenever a fresh link opens the
  // dialog so a stale confirmation from a previous share can never linger.
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (status === 'ready') setCopied(false);
  }, [status]);

  const open = status !== 'idle';
  useEscape(dismiss, open);
  if (!open) return null;

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={dismiss}>
      <div
        className="modal modal-sm"
        role="dialog"
        aria-modal="true"
        aria-label="Share this room"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <span className="modal-title">Share this room</span>
          <button type="button" className="btn-icon" aria-label="Close" onClick={dismiss}>
            <Icon name="x" />
          </button>
        </div>
        <div className="modal-body stack">
          {status === 'loading' && <p className="hint">Creating a link…</p>}
          {status === 'error' && <p className="error">{error}</p>}
          {status === 'ready' && url && (
            <>
              <p className="modal-message">
                Anyone with this link can view this room as it looks right now — read-only, no
                sign-in needed.
              </p>
              <label className="field">
                <span className="field-label">Link</span>
                <span className="field-input">
                  <input
                    type="text"
                    value={url}
                    readOnly
                    aria-label="Share link"
                    onFocus={(e) => e.currentTarget.select()}
                  />
                </span>
              </label>
              {copied && (
                <p className="hint" role="status" aria-live="polite">
                  Copied!
                </p>
              )}
            </>
          )}
        </div>
        <div className="modal-foot">
          <button type="button" className="btn" onClick={dismiss}>
            Close
          </button>
          {status === 'ready' && url && (
            <button type="button" className="btn btn-accent" onClick={copy}>
              <Icon name="copy" /> Copy link
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
