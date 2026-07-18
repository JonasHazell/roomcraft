import { useEffect, useRef, useState } from 'react';
import { useDesignStore } from '../../store/useDesignStore';
import { useUiStore } from '../../store/useUiStore';
import { confirmDialog, promptDialog } from '../../store/useDialogStore';
import { useAiSuggest } from '../../lib/useAiSuggest';
import { useEscape } from '../../lib/useEscape';
import { SwitcherList } from './SwitcherList';
import { Icon } from '../ui/Icon';

/**
 * Centred pill (on the hamburger row of the 3D view) that switches between a
 * room's furnishing proposals — the same room shape, different furniture. The
 * flanking ‹ / › arrows step through proposals without opening the menu; open
 * the menu to switch, rename, reorder (by dragging), delete, or create a new
 * proposal (starting either from the current furnishing or an empty room). The
 * menu is also where the two "get help furnishing" actions live: AI furnishing
 * suggestions and the local, no-sign-in auto-arrange — both used to sit in the
 * bottom dock's `ActionBar` pill, but moved here so that pill stays a single
 * "Add furniture" button and never competes for width with the dock's middle
 * contextual bar again (#170).
 */
export function ProposalSwitcher() {
  const proposals = useDesignStore((s) => s.design.proposals);
  const activeId = useDesignStore((s) => s.design.activeProposalId);
  const addProposal = useDesignStore((s) => s.addProposal);
  const setActiveProposal = useDesignStore((s) => s.setActiveProposal);
  const renameProposal = useDesignStore((s) => s.renameProposal);
  const reorderProposals = useDesignStore((s) => s.reorderProposals);
  const removeProposal = useDesignStore((s) => s.removeProposal);
  const autoArrange = useDesignStore((s) => s.autoArrange);
  const select = useUiStore((s) => s.select);
  const appView = useUiStore((s) => s.appView);
  // AI furnishing runs on the owner's Claude login, so when the server has
  // sign-in configured it's gated behind an account — the gating lives in the
  // shared `useAiSuggest` hook (also used by the empty-room prompt).
  const triggerAiSuggest = useAiSuggest();
  // Menu open state lives in the store so the contextual selection bar can
  // treat it as another open overlay and step aside for it.
  const open = useUiStore((s) => s.proposalMenuOpen);
  const setOpen = useUiStore((s) => s.setProposalMenuOpen);

  // The auto-arrange search is a short synchronous burst; the busy flag both
  // guards against a double-tap and shows the button as busy while it runs.
  const [arranging, setArranging] = useState(false);
  // A transient result line for the last auto-arrange, shown inside the (still
  // open) menu. Cleared whenever the menu closes, so it never lingers as stale
  // text — the next time the menu opens it starts empty.
  const [arrangeStatus, setArrangeStatus] = useState<string | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);

  const active = proposals.find((p) => p.id === activeId) ?? proposals[0];

  // The auto-arrange result is tied to the menu being open: drop it the moment
  // the menu closes (an X, Esc, outside click, or another action that closes it)
  // so a stale "Score …" line can never reappear next time.
  useEffect(() => {
    if (!open) setArrangeStatus(null);
  }, [open]);

  // Close on outside click or Esc, like the other floating surfaces.
  useEscape(() => setOpen(false), open);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [open, setOpen]);

  // Furnishing actions live in the 3D view, matching the other furniture bars.
  if (appView !== 'furnish') return null;

  const switchTo = (id: string) => {
    setActiveProposal(id);
    select(null);
    setOpen(false);
  };

  // Step to the previous/next proposal without opening the menu; wraps around.
  const step = (dir: 1 | -1) => {
    if (proposals.length <= 1) return;
    const i = proposals.findIndex((p) => p.id === active?.id);
    const next = proposals[(i + dir + proposals.length) % proposals.length];
    setActiveProposal(next.id);
    select(null);
  };

  const create = (copyCurrent: boolean) => {
    addProposal({ copyCurrent });
    select(null);
    setOpen(false);
  };

  // Third way to create furnishings, beside the two manual ones: let Claude
  // suggest three complete layouts. Closes the menu, then hands off to the shared
  // AI-suggest entry point (which clears the selection, gates on sign-in, and
  // opens the AI panel).
  const aiSuggest = () => {
    setOpen(false);
    triggerAiSuggest();
  };

  // Local, no-sign-in counterpart to the AI suggestions above: reshuffles the
  // pieces already in the current proposal — moving and rotating them — to raise
  // the design score, with no server round-trip.
  const runAutoArrange = () => {
    if (arranging) return;
    select(null);
    setArrangeStatus(null);
    setArranging(true);
    // Defer past this render so the busy state paints before the search blocks
    // the main thread for its (brief) run. The menu stays open so the result
    // line below the actions is visible right where the tap happened.
    setTimeout(() => {
      try {
        const result = autoArrange();
        setArrangeStatus(
          result === null
            ? 'Add some furniture first'
            : result.after > result.before
              ? `Score ${result.before} → ${result.after}`
              : 'Already looks good',
        );
      } finally {
        setArranging(false);
      }
    }, 16);
  };

  const rename = async (id: string, current: string) => {
    const next = await promptDialog({
      title: 'Rename proposal',
      label: 'Proposal name',
      initial: current,
    });
    if (next !== null) renameProposal(id, next);
  };

  const remove = async (id: string, name: string) => {
    if (proposals.length <= 1) return;
    const ok = await confirmDialog({
      title: 'Delete proposal',
      message: `Delete the proposal “${name}”?`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (ok) removeProposal(id);
  };

  return (
    <div className="proposal-switcher" ref={rootRef}>
      <div className="proposal-nav">
        <button
          type="button"
          className="proposal-arrow"
          title="Previous proposal"
          aria-label="Previous proposal"
          disabled={proposals.length <= 1}
          onClick={() => step(-1)}
        >
          <Icon name="chevron-left" />
        </button>
        <button
          type="button"
          className="proposal-pill"
          aria-haspopup="menu"
          aria-expanded={open}
          title="Switch furnishing proposal"
          onClick={() => setOpen(!open)}
        >
          <span className="proposal-pill-name">{active?.name ?? 'Proposal'}</span>
          <span className="proposal-pill-caret" aria-hidden="true">
            <Icon name="chevron-down" />
          </span>
        </button>
        <button
          type="button"
          className="proposal-arrow"
          title="Next proposal"
          aria-label="Next proposal"
          disabled={proposals.length <= 1}
          onClick={() => step(1)}
        >
          <Icon name="chevron-right" />
        </button>
      </div>

      {open && (
        <div className="proposal-menu" role="menu" aria-label="Furnishing proposals">
          <div className="proposal-menu-head">
            <span className="proposal-menu-title">Furnishing proposals</span>
            <button
              type="button"
              className="btn-icon"
              aria-label="Close"
              onClick={() => setOpen(false)}
            >
              <Icon name="x" />
            </button>
          </div>
          <div className="proposal-menu-body">
            <SwitcherList
              entries={proposals.map((p) => ({
                id: p.id,
                name: p.name,
              }))}
              activeId={activeId}
              noun="proposal"
              onSelect={switchTo}
              onRename={rename}
              onReorder={reorderProposals}
              onDelete={remove}
            />
          </div>
          <div className="proposal-menu-actions">
            <button
              type="button"
              className="btn btn-accent proposal-menu-ai"
              onClick={aiSuggest}
            >
              <Icon name="star" /> Suggest 3 layouts
            </button>
            <button type="button" className="btn" onClick={() => create(true)}>
              <Icon name="plus" /> New from current
            </button>
            <button type="button" className="btn" onClick={() => create(false)}>
              <Icon name="plus" /> New empty
            </button>
            <button
              type="button"
              className="btn"
              disabled={arranging}
              onClick={runAutoArrange}
            >
              <Icon name="scan" /> {arranging ? 'Arranging…' : 'Auto-arrange'}
            </button>
            {arrangeStatus && (
              <p className="hint proposal-menu-status" role="status" aria-live="polite">
                {arrangeStatus}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
