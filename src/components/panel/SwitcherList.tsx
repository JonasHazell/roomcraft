import { useRef, useState } from 'react';
import { Icon } from '../ui/Icon';

/** One entry in a switcher list (a room or a furnishing proposal). */
export interface SwitcherEntry {
  id: string;
  name: string;
}

/**
 * The list used by the proposal switcher (dropdown). Each row selects on click
 * and carries rename/delete icon buttons. When `onReorder` is supplied and there
 * is more than one entry, a grip handle lets the user drag rows into a new order;
 * releasing over a row moves the dragged entry to that row's position. `noun`
 * ("proposal") only feeds the tooltips and accessible labels.
 *
 * Reordering uses Pointer Events (not the native HTML5 drag-and-drop) so it works
 * the same with a mouse, a finger and a pen — native DnD never fires from touch,
 * and Firefox won't even start a drag without a dataTransfer payload.
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
  // The live drag id also lives in a ref so the pointer handlers never read a
  // stale value between a state update and the next render.
  const dragRef = useRef<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  // The entry row sitting under a screen point, if any (a row carries its id in
  // a data attribute so we can map the pointer position back to an entry).
  const rowIdAt = (x: number, y: number) =>
    document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-entry-id]')?.dataset.entryId ?? null;

  const startDrag = (id: string, e: React.PointerEvent) => {
    dragRef.current = id;
    setDragId(id);
    setOverId(id);
    // Capture so we keep getting moves even as the pointer leaves the handle,
    // and stop touch from scrolling the menu mid-drag.
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
  };

  const moveDrag = (e: React.PointerEvent) => {
    if (dragRef.current === null) return;
    setOverId(rowIdAt(e.clientX, e.clientY) ?? dragRef.current);
  };

  const endDrag = (e: React.PointerEvent) => {
    const from = dragRef.current;
    dragRef.current = null;
    setDragId(null);
    setOverId(null);
    if (from === null) return;
    // Resolve the drop target from the release point so it can't go stale.
    const to = rowIdAt(e.clientX, e.clientY);
    if (to && to !== from) onReorder?.(from, to);
  };

  const cancelDrag = () => {
    dragRef.current = null;
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
          <li key={entry.id} className={cls} data-entry-id={entry.id}>
            {canReorder && (
              <span
                className="switch-drag"
                role="button"
                tabIndex={-1}
                aria-label={`Drag to reorder ${noun} ${entry.name}`}
                title={`Drag to reorder ${noun}`}
                onPointerDown={(e) => startDrag(entry.id, e)}
                onPointerMove={moveDrag}
                onPointerUp={endDrag}
                onPointerCancel={cancelDrag}
              >
                <Icon name="grip-vertical" />
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
            </button>
            <button
              type="button"
              className="btn-icon"
              title={`Rename ${noun}`}
              aria-label={`Rename ${noun} ${entry.name}`}
              onClick={() => onRename(entry.id, entry.name)}
            >
              <Icon name="pencil" />
            </button>
            <button
              type="button"
              className="btn-icon"
              title={`Delete ${noun}`}
              aria-label={`Delete ${noun} ${entry.name}`}
              disabled={!canDelete}
              onClick={() => onDelete(entry.id, entry.name)}
            >
              <Icon name="x" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
