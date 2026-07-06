import { useDesignStore } from '../../store/useDesignStore';
import { useUiStore } from '../../store/useUiStore';
import { confirmDialog, promptDialog } from '../../store/useDialogStore';
import { SwitcherList } from './SwitcherList';

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

  const rename = async (id: string, current: string) => {
    const next = await promptDialog({ title: 'Rename room', label: 'Room name', initial: current });
    if (next !== null) renameRoom(id, next);
  };

  const remove = async (id: string, name: string) => {
    if (rooms.length <= 1) return;
    const ok = await confirmDialog({
      title: 'Delete room',
      message: `Delete the room “${name}”? Its furnishings are removed too.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (ok) {
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

  const entries = rooms.map((r) => {
    const proposals = r.id === activeRoomId ? activeProposals : r.proposals.length;
    return {
      id: r.id,
      name: r.name,
      count: proposals,
      countTitle: `${proposals} furnishing option(s)`,
    };
  });

  return (
    <div className="stack">
      <SwitcherList
        entries={entries}
        activeId={activeRoomId}
        noun="room"
        onSelect={switchTo}
        onRename={rename}
        onDelete={remove}
      />

      <div className="button-row">
        <button type="button" className="btn btn-accent" onClick={() => create(false)}>
          <span aria-hidden="true">＋</span> New room
        </button>
        <button type="button" className="btn" onClick={() => create(true)}>
          <span aria-hidden="true">⧉</span> Duplicate
        </button>
      </div>

      <button
        type="button"
        className={`btn ${mode === '2d' ? 'btn-accent' : ''}`}
        onClick={mode === '2d' ? () => setMode('3d') : editFloorPlan}
      >
        {mode === '2d' ? (
          <>
            <span aria-hidden="true">✓</span> Done editing plan
          </>
        ) : (
          <>
            <span aria-hidden="true">✎</span> Edit floor plan
          </>
        )}
      </button>
    </div>
  );
}
