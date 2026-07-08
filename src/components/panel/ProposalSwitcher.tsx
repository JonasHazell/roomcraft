import { useEffect, useRef, useState } from 'react';
import { useDesignStore } from '../../store/useDesignStore';
import { useUiStore } from '../../store/useUiStore';
import { confirmDialog } from '../../store/useDialogStore';
import { useEscape } from '../../lib/useEscape';
import { SwitcherList } from './SwitcherList';

/**
 * Centred pill (on the hamburger row of the 3D view) that switches between a
 * room's furnishing proposals — the same room shape, different furniture.
 * Proposals carry no name: they are identified only by their position, shown as
 * "Proposal 2/4" (index / total). The flanking ‹ / › arrows step through
 * proposals without opening the menu; open the menu to switch, delete, or create
 * a new proposal (starting either from the current furnishing or an empty room).
 */
export function ProposalSwitcher() {
  const proposals = useDesignStore((s) => s.design.proposals);
  const activeId = useDesignStore((s) => s.design.activeProposalId);
  const addProposal = useDesignStore((s) => s.addProposal);
  const setActiveProposal = useDesignStore((s) => s.setActiveProposal);
  const removeProposal = useDesignStore((s) => s.removeProposal);
  const select = useUiStore((s) => s.select);
  const appView = useUiStore((s) => s.appView);

  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const activeIdx = Math.max(
    0,
    proposals.findIndex((p) => p.id === activeId),
  );
  const active = proposals[activeIdx];
  // Proposals are labelled purely by position within the room, e.g. "Proposal 2/4".
  const label = (i: number) => `Proposal ${i + 1}/${proposals.length}`;

  // Close on outside click or Esc, like the other floating surfaces.
  useEscape(() => setOpen(false), open);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [open]);

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

  const remove = async (id: string, name: string) => {
    if (proposals.length <= 1) return;
    const ok = await confirmDialog({
      title: 'Delete proposal',
      message: `Delete ${name}?`,
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
          ‹
        </button>
        <button
          type="button"
          className="proposal-pill"
          aria-haspopup="menu"
          aria-expanded={open}
          title="Switch furnishing proposal"
          onClick={() => setOpen((o) => !o)}
        >
          <span className="proposal-pill-icon" aria-hidden="true">
            ◗
          </span>
          <span className="proposal-pill-name">{label(activeIdx)}</span>
          <span className="proposal-pill-caret" aria-hidden="true">
            ▾
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
          ›
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
              ✕
            </button>
          </div>
          <div className="proposal-menu-body">
            <SwitcherList
              entries={proposals.map((p, i) => ({
                id: p.id,
                name: label(i),
              }))}
              activeId={activeId}
              noun="proposal"
              onSelect={switchTo}
              onDelete={remove}
            />
          </div>
          <div className="proposal-menu-actions">
            <button type="button" className="btn btn-accent" onClick={() => create(true)}>
              <span aria-hidden="true">＋</span> New from current
            </button>
            <button type="button" className="btn" onClick={() => create(false)}>
              <span aria-hidden="true">＋</span> New empty
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
