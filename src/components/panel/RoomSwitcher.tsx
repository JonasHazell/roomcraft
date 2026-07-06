import { useDesignStore } from '../../store/useDesignStore';
import { useUiStore } from '../../store/useUiStore';

/**
 * The sidebar's room manager: switch between the project's rooms, create or
 * duplicate a room, rename/delete, and jump into the floor-plan editor for the
 * active room. Each room keeps its own floor plan and its own furnishing
 * proposals, so switching swaps both the shape and the furniture.
 */
export function RoomSwitcher() {
  const rooms = useDesignStore((s) => s.project.rooms);
  const activeRoomId = useDesignStore((s) => s.project.activeRoomId);
  const activeProposals = useDesignStore((s) => s.design.proposals.length);
  const addRoom = useDesignStore((s) => s.addRoom);
  const setActiveRoom = useDesignStore((s) => s.setActiveRoom);
  const renameRoom = useDesignStore((s) => s.renameRoom);
  const removeRoom = useDesignStore((s) => s.removeRoom);
  const select = useUiStore((s) => s.select);
  const mode = useUiStore((s) => s.mode);
  const setMode = useUiStore((s) => s.setMode);
  const setSidebarOpen = useUiStore((s) => s.setSidebarOpen);

  const switchTo = (id: string) => {
    setActiveRoom(id);
    select(null);
  };

  const create = (copyCurrent: boolean) => {
    addRoom({ copyCurrent });
    select(null);
  };

  const rename = (id: string, current: string) => {
    const next = window.prompt('Rename room', current);
    if (next !== null) renameRoom(id, next);
  };

  const remove = (id: string, name: string) => {
    if (rooms.length <= 1) return;
    if (window.confirm(`Delete the room “${name}”? Its furnishings are removed too.`)) {
      removeRoom(id);
      select(null);
    }
  };

  const editFloorPlan = () => {
    setMode('2d');
    select(null);
    // On mobile the sidebar is a drawer over the canvas — close it so the plan
    // editor is visible after choosing "Edit floor plan".
    setSidebarOpen(false);
  };

  return (
    <div className="stack">
      <ul className="room-list">
        {rooms.map((r) => {
          const proposals = r.id === activeRoomId ? activeProposals : r.proposals.length;
          return (
            <li key={r.id} className={r.id === activeRoomId ? 'is-active' : ''}>
              <button
                type="button"
                className="room-name"
                aria-current={r.id === activeRoomId}
                title={`Switch to “${r.name}”`}
                onClick={() => switchTo(r.id)}
              >
                <span className="room-check" aria-hidden="true">
                  {r.id === activeRoomId ? '●' : '○'}
                </span>
                <span className="room-label">{r.name}</span>
                <span className="room-count" title={`${proposals} furnishing option(s)`}>
                  {proposals}
                </span>
              </button>
              <button
                type="button"
                className="btn-icon"
                title="Rename room"
                aria-label={`Rename room ${r.name}`}
                onClick={() => rename(r.id, r.name)}
              >
                ✎
              </button>
              <button
                type="button"
                className="btn-icon"
                title="Delete room"
                aria-label={`Delete room ${r.name}`}
                disabled={rooms.length <= 1}
                onClick={() => remove(r.id, r.name)}
              >
                ✕
              </button>
            </li>
          );
        })}
      </ul>

      <div className="button-row">
        <button type="button" className="btn btn-accent" onClick={() => create(false)}>
          ＋ New room
        </button>
        <button type="button" className="btn" onClick={() => create(true)}>
          ⧉ Duplicate
        </button>
      </div>

      <button
        type="button"
        className={`btn ${mode === '2d' ? 'btn-accent' : ''}`}
        onClick={mode === '2d' ? () => setMode('3d') : editFloorPlan}
      >
        {mode === '2d' ? '✓ Done editing plan' : '✎ Edit floor plan'}
      </button>
    </div>
  );
}
