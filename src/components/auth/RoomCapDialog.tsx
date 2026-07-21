import { useAuthStore } from '../../store/useAuthStore';
import { useEscape } from '../../lib/useEscape';
import { Icon } from '../ui/Icon';

/**
 * Calm upgrade prompt shown when a signed-in free account's project can't be
 * synced because it has more rooms than the free tier allows (`lib/projectSync.ts`
 * sets `roomCapLimit` when a save is rejected — see `server/projects.ts`). The
 * room itself is never lost: it stays wherever it already was (this device's
 * `localStorage`); it's only the account's cloud copy that isn't caught up.
 */
export function RoomCapDialog() {
  const limit = useAuthStore((s) => s.roomCapLimit);
  const dismiss = () => useAuthStore.getState().setRoomCapLimit(null);

  useEscape(dismiss, limit !== null);

  if (limit === null) return null;

  return (
    <div className="modal-backdrop" role="presentation" onClick={dismiss}>
      <div
        className="modal modal-sm"
        role="dialog"
        aria-modal="true"
        aria-label="Free plan room limit"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <span className="modal-title">Free plan room limit</span>
          <button type="button" className="btn-icon" aria-label="Close" onClick={dismiss}>
            <Icon name="x" />
          </button>
        </div>
        <div className="modal-body stack">
          <p className="hint">
            Free accounts can save up to {limit} room{limit === 1 ? '' : 's'} to your account. This
            room is still here on this device, but it isn't backed up to your account — delete a
            room to free up space, or upgrade to Pro for unlimited rooms.
          </p>
        </div>
        <div className="modal-foot">
          <button type="button" className="btn btn-accent" onClick={dismiss}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
