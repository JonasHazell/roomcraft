import { useEffect, useRef, useState } from 'react';
import { useDesignStore } from '../../store/useDesignStore';
import { useUiStore } from '../../store/useUiStore';

/**
 * Centred pill (on the hamburger row of the 3D view) that switches between a
 * room's furnishing proposals — the same room shape, different furniture. The
 * flanking ‹ / › arrows step through proposals without opening the menu; open
 * the menu to switch, rename, delete, or create a new proposal (starting either
 * from the current furnishing or an empty room).
 */
export function ProposalSwitcher() {
  const proposals = useDesignStore((s) => s.design.proposals);
  const activeId = useDesignStore((s) => s.design.activeProposalId);
  const addProposal = useDesignStore((s) => s.addProposal);
  const setActiveProposal = useDesignStore((s) => s.setActiveProposal);
  const renameProposal = useDesignStore((s) => s.renameProposal);
  const removeProposal = useDesignStore((s) => s.removeProposal);
  const select = useUiStore((s) => s.select);
  const mode = useUiStore((s) => s.mode);

  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const active = proposals.find((p) => p.id === activeId) ?? proposals[0];

  // Close on outside click or Esc, like the other floating surfaces.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Furnishing actions live in the 3D view, matching the other furniture bars.
  if (mode !== '3d') return null;

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

  const rename = (id: string, current: string) => {
    const next = window.prompt('Rename proposal', current);
    if (next !== null) renameProposal(id, next);
  };

  const remove = (id: string, name: string) => {
    if (proposals.length <= 1) return;
    if (window.confirm(`Delete the proposal “${name}”?`)) removeProposal(id);
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
          <span className="proposal-pill-name">{active?.name ?? 'Proposal'}</span>
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
          <p className="proposal-menu-head">Furnishing proposals</p>
          <ul className="proposal-list">
            {proposals.map((p) => (
              <li key={p.id} className={p.id === activeId ? 'is-active' : ''}>
                <button
                  type="button"
                  className="proposal-name"
                  aria-current={p.id === activeId}
                  title={`Switch to “${p.name}”`}
                  onClick={() => switchTo(p.id)}
                >
                  <span className="proposal-check" aria-hidden="true">
                    {p.id === activeId ? '●' : '○'}
                  </span>
                  <span className="proposal-label">{p.name}</span>
                  <span className="proposal-count">{p.furniture.length}</span>
                </button>
                <button
                  type="button"
                  className="btn-icon"
                  title="Rename"
                  aria-label={`Rename proposal ${p.name}`}
                  onClick={() => rename(p.id, p.name)}
                >
                  ✎
                </button>
                <button
                  type="button"
                  className="btn-icon"
                  title="Delete proposal"
                  aria-label={`Delete proposal ${p.name}`}
                  disabled={proposals.length <= 1}
                  onClick={() => remove(p.id, p.name)}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <div className="proposal-menu-actions">
            <button type="button" className="btn btn-accent" onClick={() => create(true)}>
              ＋ New from current
            </button>
            <button type="button" className="btn" onClick={() => create(false)}>
              ＋ New empty
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
