import type { WallId, WallOpening } from '../../types';
import { WALL_DEFS, wallLength } from '../../lib/geometry';
import { useDesignStore } from '../../store/useDesignStore';
import { NumberField } from './fields';

export function OpeningsEditor() {
  const openings = useDesignStore((s) => s.design.openings);
  const addOpening = useDesignStore((s) => s.addOpening);

  return (
    <div className="stack">
      <div className="button-row">
        <button
          type="button"
          className="btn"
          onClick={() =>
            addOpening({ kind: 'door', wall: 'south', offset: 0.5, width: 0.9, height: 2.1, elevation: 0 })
          }
        >
          + Dörr
        </button>
        <button
          type="button"
          className="btn"
          onClick={() =>
            addOpening({ kind: 'window', wall: 'north', offset: 0.8, width: 1.2, height: 1.2, elevation: 0.9 })
          }
        >
          + Fönster
        </button>
      </div>
      {openings.length === 0 && <p className="hint">Inga dörrar eller fönster ännu.</p>}
      {openings.map((o) => (
        <OpeningCard key={o.id} opening={o} />
      ))}
    </div>
  );
}

function OpeningCard({ opening: o }: { opening: WallOpening }) {
  const room = useDesignStore((s) => s.design.room);
  const updateOpening = useDesignStore((s) => s.updateOpening);
  const removeOpening = useDesignStore((s) => s.removeOpening);
  const len = wallLength(o.wall, room);

  return (
    <div className="card">
      <div className="card-head">
        <span className={`chip ${o.kind}`}>{o.kind === 'door' ? 'Dörr' : 'Fönster'}</span>
        <select
          value={o.wall}
          onChange={(e) => updateOpening(o.id, { wall: e.target.value as WallId })}
        >
          {WALL_DEFS.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn-icon"
          title="Ta bort"
          onClick={() => removeOpening(o.id)}
        >
          ✕
        </button>
      </div>
      <div className="field-grid">
        <NumberField
          label="Position"
          value={o.offset}
          max={Math.max(len - o.width, 0)}
          onChange={(offset) => updateOpening(o.id, { offset })}
        />
        <NumberField
          label="Bredd"
          value={o.width}
          min={0.1}
          max={len}
          onChange={(width) => updateOpening(o.id, { width })}
        />
        <NumberField
          label="Höjd"
          value={o.height}
          min={0.1}
          max={room.height}
          onChange={(height) => updateOpening(o.id, { height })}
        />
        {o.kind === 'window' && (
          <NumberField
            label="Över golv"
            value={o.elevation}
            max={room.height}
            onChange={(elevation) => updateOpening(o.id, { elevation })}
          />
        )}
      </div>
      <p className="hint">Position mäts från väggens vänstra hörn sett inifrån rummet.</p>
    </div>
  );
}
