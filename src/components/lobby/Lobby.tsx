import { useRef, useState } from 'react';
import { useDesignStore } from '../../store/useDesignStore';
import { confirmDialog, promptDialog } from '../../store/useDialogStore';
import {
  exportProject,
  importProject,
  syncActiveProposal,
  syncActiveRoom,
} from '../../lib/persistence';
import { createRoomAndDraw, openRoomToFurnish, openRoomToPlan } from '../../lib/nav';

/** The live workspace with the on-screen room folded back in (for export). */
function currentProject() {
  const s = useDesignStore.getState();
  return syncActiveRoom(s.project, syncActiveProposal(s.design));
}

/**
 * The lobby: the app's home surface, kept separate from furnishing. Here you
 * pick a room to furnish, create a new room (which opens the floor-plan editor
 * to draw it), edit an existing room's floor plan, duplicate/rename/delete
 * rooms, and export or import the whole workspace. Furnishing a room happens on
 * its own surface, reached by opening a room card.
 */
export function Lobby() {
  const rooms = useDesignStore((s) => s.project.rooms);
  const duplicateRoom = useDesignStore((s) => s.duplicateRoom);
  const renameRoom = useDesignStore((s) => s.renameRoom);
  const removeRoom = useDesignStore((s) => s.removeRoom);
  const loadProject = useDesignStore((s) => s.loadProject);

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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

  const onImport = async (file: File) => {
    try {
      const project = await importProject(file);
      loadProject(project);
      setError(null);
      setNotice(`Imported “${project.name}”.`);
    } catch (e) {
      setNotice(null);
      setError(e instanceof Error ? e.message : 'Import failed.');
    }
  };

  return (
    <div className="lobby">
      <header className="lobby-head">
        <div className="lobby-brand">
          <h1>Roomcraft</h1>
          <p>Pick a room to furnish, or create a new one.</p>
        </div>
        <div className="lobby-tools">
          <button type="button" className="btn" onClick={() => exportProject(currentProject())}>
            Export JSON
          </button>
          <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
            Import JSON
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onImport(file);
              e.target.value = '';
            }}
          />
        </div>
      </header>

      {(notice || error) && (
        <div className="lobby-messages">
          {notice && <p className="hint">{notice}</p>}
          {error && <p className="error">{error}</p>}
        </div>
      )}

      {rooms.length === 0 ? (
        <div className="lobby-empty">
          <h2>Create your first room</h2>
          <p>Start by drawing the floor plan; then you can furnish it in 3D.</p>
          <button type="button" className="btn btn-accent btn-lg" onClick={() => createRoomAndDraw()}>
            <span aria-hidden="true">＋</span> Create a room
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
                    {drawn ? '▤' : '✎'}
                  </span>
                  <span className="room-card-name">{r.name}</span>
                  <span className="room-card-meta">
                    {drawn
                      ? `${r.proposals.length} furnishing option${r.proposals.length === 1 ? '' : 's'}`
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
                    ✕
                  </button>
                </div>
              </div>
            );
          })}

          <button type="button" className="room-card room-card-new" onClick={() => createRoomAndDraw()}>
            <span className="room-card-thumb" aria-hidden="true">
              ＋
            </span>
            <span className="room-card-name">New room</span>
            <span className="room-card-meta">Draw its floor plan</span>
          </button>
        </div>
      )}
    </div>
  );
}
