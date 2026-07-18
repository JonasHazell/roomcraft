import { useEffect, useState } from 'react';
import { useStorageStatus } from '../../store/useStorageStatus';
import { useEscape } from '../../lib/useEscape';
import { Icon } from './Icon';

/**
 * A calm, dismissible notice shown whenever a save to localStorage fails (quota
 * exceeded, or Safari Private Browsing). The edit itself is always kept in
 * memory — this only tells the truth about whether it reached disk, replacing
 * the alternative of letting the failure crash to the app-wide error boundary
 * (see `useDesignStore`'s `safeLocalStorage` and `persistence.ts`'s
 * `writeLibrary`). Re-appears on the next failed save even after dismissal, so a
 * standing quota problem isn't silenced after the first notice.
 */
export function SaveErrorBanner() {
  const saveFailed = useStorageStatus((s) => s.saveFailed);
  const [dismissed, setDismissed] = useState(false);

  // A fresh failure (after a prior dismissal, or after a save recovered and then
  // failed again) should surface again rather than staying silenced.
  useEffect(() => {
    if (saveFailed) setDismissed(false);
  }, [saveFailed]);

  const show = saveFailed && !dismissed;
  useEscape(() => setDismissed(true), show);

  if (!show) return null;

  return (
    <div className="save-error-banner" role="alert">
      <p className="error">
        Changes aren’t saving — storage is full or unavailable. Kept for this session only.
      </p>
      <button
        type="button"
        className="btn-icon"
        aria-label="Dismiss"
        onClick={() => setDismissed(true)}
      >
        <Icon name="x" />
      </button>
    </div>
  );
}
