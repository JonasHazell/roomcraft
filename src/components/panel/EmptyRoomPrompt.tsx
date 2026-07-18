import { useState } from 'react';
import { useDesignStore } from '../../store/useDesignStore';
import { useUiStore } from '../../store/useUiStore';
import { useAiSuggest } from '../../lib/useAiSuggest';
import { useEscape } from '../../lib/useEscape';
import { Icon } from '../ui/Icon';

/**
 * A calm, dismissible nudge shown in the 3D furnish view when the active proposal
 * has no furniture — so a first-time user landing in a bare room never sees a
 * blank page (#325). It surfaces the single most important call to action ("let
 * us furnish this for you") with the two "get help" actions that otherwise hide
 * inside the proposal menu:
 *
 * - **Suggest 3 layouts** — the primary AI path (`useAiSuggest`, which carries the
 *   same sign-in gating the proposal menu uses).
 * - **Add furniture** — opens the same picker as the dock's `+` pill.
 *
 * It disappears the moment the room has any piece, and can be dismissed (Esc or
 * the close button). Dismissal is scoped to the active proposal, so switching to —
 * or creating — another empty proposal re-offers the help rather than staying
 * silent forever. This is purely a "never a blank page" prompt, not a permanent
 * control.
 */
export function EmptyRoomPrompt() {
  // `design.furniture` is the active proposal's furniture (the live mirror).
  const isEmpty = useDesignStore((s) => s.design.furniture.length === 0);
  const activeProposalId = useDesignStore((s) => s.design.activeProposalId);
  const openAddFurniture = useUiStore((s) => s.openAddFurniture);
  const aiSuggest = useAiSuggest();

  // Remember which proposal the user dismissed the prompt for, so a different
  // (also empty) proposal shows it again instead of inheriting the dismissal.
  const [dismissedFor, setDismissedFor] = useState<string | null>(null);
  const dismissed = dismissedFor === activeProposalId;

  const show = isEmpty && !dismissed;
  useEscape(() => setDismissedFor(activeProposalId), show);

  if (!show) return null;

  return (
    <div className="empty-room-prompt">
      <div className="card">
        <div className="card-head">
          <span className="empty-room-prompt-title">Let’s furnish this room</span>
          <button
            type="button"
            className="btn-icon"
            aria-label="Dismiss"
            onClick={() => setDismissedFor(activeProposalId)}
          >
            <Icon name="x" />
          </button>
        </div>
        <div className="button-row">
          <button type="button" className="btn btn-accent" onClick={aiSuggest}>
            <Icon name="star" /> Suggest 3 layouts
          </button>
          <button type="button" className="btn" onClick={openAddFurniture}>
            <Icon name="plus" /> Add furniture
          </button>
        </div>
      </div>
    </div>
  );
}
