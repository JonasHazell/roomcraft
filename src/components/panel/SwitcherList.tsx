/** One entry in a switcher list (a room or a furnishing proposal). */
export interface SwitcherEntry {
  id: string;
  name: string;
  /** Number shown at the end of the row (proposals per room, or pieces per proposal). */
  count: number;
  /** Optional tooltip for the count badge. */
  countTitle?: string;
}

/**
 * The shared list used by both the room switcher (sidebar) and the proposal
 * switcher (dropdown). Each row selects on click and carries rename/delete icon
 * buttons, so the two switchers look and behave identically. `noun` ("room" /
 * "proposal") only feeds the tooltips and accessible labels.
 */
export function SwitcherList({
  entries,
  activeId,
  noun,
  onSelect,
  onRename,
  onDelete,
}: {
  entries: SwitcherEntry[];
  activeId: string;
  noun: string;
  onSelect: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string, name: string) => void;
}) {
  // The last remaining room/proposal can't be deleted — always keep one.
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
              title={`Switch to “${entry.name}”`}
              onClick={() => onSelect(entry.id)}
            >
              <span className="switch-check" aria-hidden="true">
                {active ? '●' : '○'}
              </span>
              <span className="switch-label">{entry.name}</span>
              <span className="switch-count" title={entry.countTitle}>
                {entry.count}
              </span>
            </button>
            <button
              type="button"
              className="btn-icon"
              title={`Rename ${noun}`}
              aria-label={`Rename ${noun} ${entry.name}`}
              onClick={() => onRename(entry.id, entry.name)}
            >
              ✎
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
