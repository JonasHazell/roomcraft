import { useEffect, useRef, useState } from 'react';
import { useDesignStore } from '../../store/useDesignStore';
import { confirmDialog, promptDialog } from '../../store/useDialogStore';
import { openRoomToFurnish, openRoomToPlan, startNewRoom } from '../../lib/nav';
import { floorPolygon } from '../../lib/polygon';
import { templatePath } from '../../lib/roomTemplates';
import { Icon } from '../ui/Icon';
import { AccountControl } from '../auth/AccountControl';

/**
 * The "My homes" switcher: every home project on this device, plus a way to
 * create another one (#382). A sibling of the room grid below it — same card
 * language, one level up — so a user with more than one home to plan (their
 * own place and a parent's, say) can keep them side by side instead of one
 * silently replacing the other. Each home keeps its own independent rooms,
 * furniture and proposals; switching never merges or leaks state between them.
 */
function HomeSwitcher() {
  const projects = useDesignStore((s) => s.workspace.projects);
  const activeProjectId = useDesignStore((s) => s.workspace.activeProjectId);
  const setActiveHome = useDesignStore((s) => s.setActiveHome);
  const renameHome = useDesignStore((s) => s.renameHome);
  const removeHome = useDesignStore((s) => s.removeHome);
  const addHome = useDesignStore((s) => s.addHome);

  const rename = async (id: string, current: string) => {
    const next = await promptDialog({ title: 'Rename home', label: 'Home name', initial: current });
    if (next !== null) renameHome(id, next);
  };

  const remove = async (id: string, name: string) => {
    const ok = await confirmDialog({
      title: 'Delete home',
      message: `Delete “${name}”? Its rooms and furnishings are removed too.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (ok) removeHome(id);
  };

  return (
    <section className="home-switcher" aria-label="My homes">
      <h2 className="home-switcher-title">My homes</h2>
      <div className="home-list">
        {projects.map((p) => {
          const active = p.id === activeProjectId;
          return (
            <div key={p.id} className={active ? 'home-card home-card-active' : 'home-card'}>
              <button
                type="button"
                className="home-card-main"
                title={`Switch to “${p.name}”`}
                onClick={() => setActiveHome(p.id)}
              >
                <span className="home-card-icon" aria-hidden="true">
                  <Icon name="home" />
                </span>
                <span className="home-card-name">{p.name}</span>
                <span className="home-card-meta">
                  {p.rooms.length} room{p.rooms.length === 1 ? '' : 's'}
                </span>
              </button>
              <div className="home-card-actions">
                <button
                  type="button"
                  className="btn-icon"
                  title="Rename home"
                  aria-label={`Rename home ${p.name}`}
                  onClick={() => rename(p.id, p.name)}
                >
                  <Icon name="pencil" />
                </button>
                <button
                  type="button"
                  className="btn-icon"
                  title="Delete home"
                  aria-label={`Delete home ${p.name}`}
                  disabled={projects.length <= 1}
                  onClick={() => remove(p.id, p.name)}
                >
                  <Icon name="x" />
                </button>
              </div>
            </div>
          );
        })}
        <button type="button" className="home-card home-card-new" onClick={() => addHome()}>
          <span className="home-card-icon" aria-hidden="true">
            <Icon name="plus" />
          </span>
          New home
        </button>
      </div>
    </section>
  );
}

/**
 * The lobby: the app's home surface, kept separate from furnishing. Here you
 * pick a room to furnish, create a new room (which opens straight in the plan
 * editor — name it, draw it, add doors & windows, all on one surface — then
 * furnish it in 3D), edit an existing room's floor plan, and
 * duplicate/rename/delete rooms. Furnishing a room happens on its own surface,
 * reached by opening a room card. The "My homes" switcher above the room grid
 * (#382) lets a user keep more than one home project — each with its own
 * independent rooms — side by side on the same device.
 */
export function Lobby() {
  const rooms = useDesignStore((s) => s.project.rooms);
  const duplicateRoom = useDesignStore((s) => s.duplicateRoom);
  const renameRoom = useDesignStore((s) => s.renameRoom);
  const removeRoom = useDesignStore((s) => s.removeRoom);

  // The most recently duplicated room's id: while set, its card gets a brief
  // highlight and is scrolled into view, so the copy doesn't look like the
  // action silently did nothing on a longer room list.
  const [justDuplicatedId, setJustDuplicatedId] = useState<string | null>(null);
  const cardRefs = useRef(new Map<string, HTMLDivElement>());

  useEffect(() => {
    if (!justDuplicatedId) return;
    cardRefs.current.get(justDuplicatedId)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [justDuplicatedId]);

  const rename = async (id: string, current: string) => {
    const next = await promptDialog({ title: 'Rename room', label: 'Room name', initial: current });
    if (next !== null) renameRoom(id, next);
  };

  const duplicate = (id: string) => {
    const newId = duplicateRoom(id);
    if (newId) setJustDuplicatedId(newId);
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
      <header className="lobby-head">
        <div className="lobby-brand">
          <h1>Roomcraft</h1>
          <p>Pick a room to furnish, or create a new one.</p>
          <button
            type="button"
            className="btn lobby-patio-link"
            title="Plan an outdoor patio in 3D"
            onClick={() => {
              window.location.hash = 'patio';
            }}
          >
            <Icon name="home" /> Plan a patio in 3D
          </button>
        </div>
        <AccountControl />
      </header>

      <HomeSwitcher />

      {rooms.length === 0 ? (
        <div className="lobby-empty">
          <h2>Create your first room</h2>
          <p>Start by drawing the floor plan; then you can furnish it in 3D.</p>
          <button type="button" className="btn btn-accent btn-lg" onClick={startNewRoom}>
            <Icon name="plus" /> Create a room
          </button>
        </div>
      ) : (
        <div className="room-grid">
          {rooms.map((r) => {
            const drawn = r.walls.some((w) => w.kind === 'exterior');
            const justDuplicated = r.id === justDuplicatedId;
            return (
              <div
                key={r.id}
                ref={(el) => {
                  if (el) cardRefs.current.set(r.id, el);
                  else cardRefs.current.delete(r.id);
                }}
                className={justDuplicated ? 'room-card room-card-duplicated' : 'room-card'}
                onAnimationEnd={() => {
                  if (justDuplicated) setJustDuplicatedId(null);
                }}
              >
                <button
                  type="button"
                  className="room-card-main"
                  title={drawn ? `Furnish “${r.name}”` : `Draw the floor plan for “${r.name}”`}
                  onClick={() => (drawn ? openRoomToFurnish(r.id) : openRoomToPlan(r.id))}
                >
                  <span className="room-card-thumb" aria-hidden="true">
                    {drawn ? (
                      <svg className="room-card-thumb-svg" viewBox="0 0 40 40" width="30" height="30">
                        <path d={templatePath(floorPolygon(r.walls))} />
                      </svg>
                    ) : (
                      <Icon name="pencil" />
                    )}
                  </span>
                  <span className="room-card-name">{r.name}</span>
                  <span className="room-card-meta">
                    <span>
                      {drawn
                        ? `${r.proposals.length} furnishing proposal${r.proposals.length === 1 ? '' : 's'}`
                        : 'No floor plan yet'}
                    </span>
                    <span className="room-card-chevron" aria-hidden="true">
                      <Icon name="chevron-right" />
                    </span>
                  </span>
                </button>
                <div className="room-card-actions">
                  {/* For an undrawn room the card's own main tap target already
                      opens the plan editor, so a second "Edit plan" button would
                      be redundant. It stays for a drawn room, where it's a
                      distinct action from the main "Furnish" tap. */}
                  {drawn && (
                    <button type="button" className="btn" onClick={() => openRoomToPlan(r.id)}>
                      Edit plan
                    </button>
                  )}
                  <button type="button" className="btn" onClick={() => rename(r.id, r.name)}>
                    Rename
                  </button>
                  <button
                    type="button"
                    className="btn"
                    title="Duplicate this room (floor plan + furnishings)"
                    onClick={() => duplicate(r.id)}
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

          <button type="button" className="room-card room-card-new" onClick={startNewRoom}>
            <span className="room-card-thumb" aria-hidden="true">
              <Icon name="plus" />
            </span>
            <span className="room-card-name">New room</span>
            <span className="room-card-meta">Name it, draw it, furnish it</span>
          </button>
        </div>
      )}
    </div>
  );
}
