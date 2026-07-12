import { useDesignStore } from '../../store/useDesignStore';
import { useProjectsStore } from '../../store/useProjectsStore';
import { confirmDialog, promptDialog } from '../../store/useDialogStore';
import { createRoomAndDraw, openRoomToFurnish, openRoomToPlan } from '../../lib/nav';
import {
  createProject,
  deleteProject,
  duplicateProject,
  renameProject,
  switchProject,
} from '../../lib/projects';
import { Icon } from '../ui/Icon';

/**
 * The lobby: the app's home surface, kept separate from furnishing. A "My
 * projects" bar switches between separate local projects; below it you pick a
 * room to furnish, create a new room (which opens the floor-plan editor to draw
 * it), edit an existing room's floor plan, and duplicate/rename/delete rooms.
 * Furnishing a room happens on its own surface, reached by opening a room card.
 */
export function Lobby() {
  const rooms = useDesignStore((s) => s.project.rooms);
  const duplicateRoom = useDesignStore((s) => s.duplicateRoom);
  const renameRoom = useDesignStore((s) => s.renameRoom);
  const removeRoom = useDesignStore((s) => s.removeRoom);

  const metas = useProjectsStore((s) => s.metas);
  const activeId = useProjectsStore((s) => s.activeId);
  const stash = useProjectsStore((s) => s.stash);
  const activeName = useDesignStore((s) => s.project.name);

  const roomCount = (id: string) =>
    id === activeId ? rooms.length : (stash[id]?.rooms.length ?? 0);

  const renameActiveProject = async () => {
    const next = await promptDialog({
      title: 'Rename project',
      label: 'Project name',
      initial: activeName,
    });
    if (next !== null) renameProject(activeId, next);
  };

  const deleteActiveProject = async () => {
    const ok = await confirmDialog({
      title: 'Delete project',
      message: `Delete the project “${activeName}”? All of its rooms are removed too.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (ok) deleteProject(activeId);
  };

  const rename = async (id: string, current: string) => {
    const next = await promptDialog({ title: 'Rename room', label: 'Room name', initial: current });
    if (next !== null) renameRoom(id, next);
  };

  const remove = async (id: string, name: string) => {
    const ok = await confirmDialog({
      title: 'Delete room',
      message: `Delete the room “${name}”? Its furnishings are removed too.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (ok) removeRoom(id);
  };

  return (
    <div className="lobby">
      <div className="project-bar">
        <div className="project-tabs" role="tablist" aria-label="My projects">
          {metas.map((m) => {
            const count = roomCount(m.id);
            return (
              <button
                key={m.id}
                type="button"
                role="tab"
                aria-selected={m.id === activeId}
                className={`project-tab${m.id === activeId ? ' active' : ''}`}
                title={m.id === activeId ? `“${m.name}” (current project)` : `Switch to “${m.name}”`}
                onClick={() => switchProject(m.id)}
              >
                <span className="project-tab-name">{m.name}</span>
                <span className="project-tab-meta">
                  {count} room{count === 1 ? '' : 's'}
                </span>
              </button>
            );
          })}
          <button
            type="button"
            className="project-tab project-tab-new"
            title="Start a new, separate project"
            onClick={() => createProject()}
          >
            <Icon name="plus" /> New project
          </button>
        </div>
        <div className="project-actions">
          <button type="button" className="btn" onClick={renameActiveProject}>
            Rename
          </button>
          <button
            type="button"
            className="btn"
            title="Save a copy of this project (all its rooms)"
            onClick={() => duplicateProject(activeId)}
          >
            Duplicate
          </button>
          <button type="button" className="btn" onClick={deleteActiveProject}>
            Delete project
          </button>
        </div>
      </div>

      <header className="lobby-head">
        <div className="lobby-brand">
          <h1>{activeName}</h1>
          <p>Pick a room to furnish, or create a new one.</p>
        </div>
      </header>

      {rooms.length === 0 ? (
        <div className="lobby-empty">
          <h2>Create your first room</h2>
          <p>Start by drawing the floor plan; then you can furnish it in 3D.</p>
          <button type="button" className="btn btn-accent btn-lg" onClick={() => createRoomAndDraw()}>
            <Icon name="plus" /> Create a room
          </button>
        </div>
      ) : (
        <div className="room-grid">
          {rooms.map((r) => {
            const drawn = r.walls.some((w) => w.kind === 'exterior');
            return (
              <div key={r.id} className="room-card">
                <button
                  type="button"
                  className="room-card-main"
                  title={drawn ? `Furnish “${r.name}”` : `Draw the floor plan for “${r.name}”`}
                  onClick={() => (drawn ? openRoomToFurnish(r.id) : openRoomToPlan(r.id))}
                >
                  <span className="room-card-thumb" aria-hidden="true">
                    <Icon name={drawn ? 'square' : 'pencil'} />
                  </span>
                  <span className="room-card-name">{r.name}</span>
                  <span className="room-card-meta">
                    {drawn
                      ? `${r.proposals.length} furnishing proposal${r.proposals.length === 1 ? '' : 's'}`
                      : 'No floor plan yet'}
                  </span>
                </button>
                <div className="room-card-actions">
                  <button type="button" className="btn" onClick={() => openRoomToPlan(r.id)}>
                    Edit plan
                  </button>
                  <button type="button" className="btn" onClick={() => rename(r.id, r.name)}>
                    Rename
                  </button>
                  <button
                    type="button"
                    className="btn"
                    title="Duplicate this room (floor plan + furnishings)"
                    onClick={() => duplicateRoom(r.id)}
                  >
                    Duplicate
                  </button>
                  <button
                    type="button"
                    className="btn-icon"
                    aria-label={`Delete ${r.name}`}
                    title="Delete room"
                    onClick={() => remove(r.id, r.name)}
                  >
                    <Icon name="x" />
                  </button>
                </div>
              </div>
            );
          })}

          <button type="button" className="room-card room-card-new" onClick={() => createRoomAndDraw()}>
            <span className="room-card-thumb" aria-hidden="true">
              <Icon name="plus" />
            </span>
            <span className="room-card-name">New room</span>
            <span className="room-card-meta">Draw its floor plan</span>
          </button>
        </div>
      )}
    </div>
  );
}
