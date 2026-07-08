/** One entry in the proposal switcher list. */
export interface SwitcherEntry {
  id: string;
  /** The label shown for the row (e.g. "Proposal 2/4"). */
  name: string;
}

/**
 * The list used by the proposal switcher (dropdown). Each row selects on click
 * and carries a delete icon button. Proposals are identified only by their
 * position, so there is no name to edit and no per-row count. `noun`
 * ("proposal") only feeds the tooltips and accessible labels.
 */
export function SwitcherList({
  entries,
  activeId,
  noun,
  onSelect,
  onDelete,
}: {
  entries: SwitcherEntry[];
  activeId: string;
  noun: string;
  onSelect: (id: string) => void;
  onDelete: (id: string, name: string) => void;
}) {
  // The last remaining proposal can't be deleted — always keep one.
  const canDelete = entries.length > 1;

  return (
    <ul className="switch-list">
      {entries.map((entry) => {
        const active = entry.id === activeId;
        return (
          <li key={entry.id} className={active ? 'is-active' : ''}>
            <button
              type="button"
              className="switch-name"
              aria-current={active}
              title={`Switch to ${entry.name}`}
              onClick={() => onSelect(entry.id)}
            >
              <span className="switch-check" aria-hidden="true">
                {active ? '●' : '○'}
              </span>
              <span className="switch-label">{entry.name}</span>
            </button>
            <button
              type="button"
              className="btn-icon"
              title={`Delete ${noun}`}
              aria-label={`Delete ${noun} ${entry.name}`}
              disabled={!canDelete}
              onClick={() => onDelete(entry.id, entry.name)}
            >
              ✕
            </button>
          </li>
        );
      })}
    </ul>
  );
}
