import { useState } from 'react';

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
 * The list used by the proposal switcher (dropdown). Each row selects on click
 * and carries rename/delete icon buttons. When `onReorder` is supplied and there
 * is more than one entry, a grip handle lets the user drag rows into a new order;
 * dropping onto a row moves the dragged entry to that row's position. `noun`
 * ("proposal") only feeds the tooltips and accessible labels.
 */
export function SwitcherList({
  entries,
  activeId,
  noun,
  onSelect,
  onRename,
  onReorder,
  onDelete,
}: {
  entries: SwitcherEntry[];
  activeId: string;
  noun: string;
  onSelect: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onReorder?: (fromId: string, toId: string) => void;
  onDelete: (id: string, name: string) => void;
}) {
  // The last remaining proposal can't be deleted — always keep one.
  const canDelete = entries.length > 1;
  // Dragging only makes sense with something to reorder against.
  const canReorder = !!onReorder && entries.length > 1;

  // Which row is being dragged, and which row it is currently hovering over.
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const drop = (targetId: string) => {
    if (dragId && dragId !== targetId) onReorder?.(dragId, targetId);
    setDragId(null);
    setOverId(null);
  };

  return (
    <ul className="switch-list">
      {entries.map((entry) => {
        const active = entry.id === activeId;
        const dragging = dragId === entry.id;
        const isOver = canReorder && overId === entry.id && !dragging;
        const cls = [active ? 'is-active' : '', dragging ? 'is-dragging' : '', isOver ? 'is-drop-target' : '']
          .filter(Boolean)
          .join(' ');
        return (
          <li
            key={entry.id}
            className={cls}
            onDragOver={
              canReorder
                ? (e) => {
                    e.preventDefault();
                    setOverId(entry.id);
                  }
                : undefined
            }
            onDrop={
              canReorder
                ? (e) => {
                    e.preventDefault();
                    drop(entry.id);
                  }
                : undefined
            }
          >
            {canReorder && (
              <span
                className="switch-drag"
                role="button"
                tabIndex={-1}
                aria-label={`Drag to reorder ${noun} ${entry.name}`}
                title={`Drag to reorder ${noun}`}
                draggable
                onDragStart={(e) => {
                  setDragId(entry.id);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragEnd={() => {
                  setDragId(null);
                  setOverId(null);
                }}
              >
                ⠿
              </span>
            )}
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
