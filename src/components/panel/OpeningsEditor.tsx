import type { Wall, WallOpening } from '../../types';
import { defaultOpening, formatCm, OPENING_ICON, wallLabel, wallLen } from '../../lib/polygon';
import { useDesignStore } from '../../store/useDesignStore';
import { useUiStore } from '../../store/useUiStore';
import { NumberField } from './fields';

export function OpeningsEditor() {
  const walls = useDesignStore((s) => s.design.walls);
  const openings = useDesignStore((s) => s.design.openings);
  const addOpening = useDesignStore((s) => s.addOpening);
  const selection = useUiStore((s) => s.selection);
  const select = useUiStore((s) => s.select);

  const wall =
    selection?.kind === 'wall' ? walls.find((w) => w.id === selection.id) : undefined;
  const wallOpenings = wall ? openings.filter((o) => o.wallId === wall.id) : [];
  const otherOpenings = openings.filter((o) => o.wallId !== wall?.id);

  return (
    <div className="stack">
      {!wall && (
        <p className="hint">
          Select a wall (click in the 3D view or the floor plan) to add doors and
          windows.
        </p>
      )}
      {wall && (
        <>
          <p className="hint">
            <strong>{wallLabel(walls, wall.id)}</strong> · {formatCm(wallLen(wall))}
          </p>
          <div className="button-row">
            <button
              type="button"
              className="btn"
              onClick={() => addOpening(defaultOpening('door', wall.id))}
            >
              {OPENING_ICON.door} Door
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => addOpening(defaultOpening('window', wall.id))}
            >
              {OPENING_ICON.window} Window
            </button>
          </div>
          {wallOpenings.length === 0 && (
            <p className="hint">No doors or windows on this wall yet.</p>
          )}
          {wallOpenings.map((o) => (
            <OpeningCard key={o.id} opening={o} wall={wall} />
          ))}
        </>
      )}
      {otherOpenings.length > 0 && (
        <>
          <p className="hint">{wall ? 'Other openings:' : 'All openings:'}</p>
          <ul className="opening-list">
            {otherOpenings.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  onClick={() => select({ kind: 'wall', id: o.wallId })}
                  title="Select the wall"
                >
                  {o.kind === 'door' ? 'Door' : 'Window'} · {wallLabel(walls, o.wallId)}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function OpeningCard({ opening: o, wall }: { opening: WallOpening; wall: Wall }) {
  const room = useDesignStore((s) => s.design.room);
  const updateOpening = useDesignStore((s) => s.updateOpening);
  const removeOpening = useDesignStore((s) => s.removeOpening);
  const len = wallLen(wall);

  return (
    <div className="card">
      <div className="card-head">
        <span className={`chip ${o.kind}`}>{o.kind === 'door' ? 'Door' : 'Window'}</span>
        <button
          type="button"
          className="btn-icon"
          title="Delete"
          onClick={() => removeOpening(o.id)}
        >
          ✕
        </button>
      </div>
      <div className="field-grid">
        <NumberField
          label="Position"
          value={Math.round(o.offset * 100)}
          max={Math.max(Math.round((len - o.width) * 100), 0)}
          step={1}
          onChange={(v) => updateOpening(o.id, { offset: v / 100 })}
        />
        <NumberField
          label="Width"
          value={Math.round(o.width * 100)}
          min={10}
          max={Math.round(len * 100)}
          step={1}
          onChange={(v) => updateOpening(o.id, { width: v / 100 })}
        />
        <NumberField
          label="Height"
          value={Math.round(o.height * 100)}
          min={10}
          max={Math.round(room.height * 100)}
          step={1}
          onChange={(v) => updateOpening(o.id, { height: v / 100 })}
        />
        {o.kind === 'window' && (
          <NumberField
            label="Above floor"
            value={Math.round(o.elevation * 100)}
            max={Math.round(room.height * 100)}
            step={1}
            onChange={(v) => updateOpening(o.id, { elevation: v / 100 })}
          />
        )}
      </div>
      <p className="hint">Position is measured from the wall's start point, seen from inside the room.</p>
    </div>
  );
}
