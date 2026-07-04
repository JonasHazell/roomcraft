import type { Wall, WallOpening } from '../../types';
import { formatCm, wallLabel, wallLen } from '../../lib/polygon';
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
          Välj en vägg (klicka i 3D-vyn eller planritningen) för att lägga till dörrar och
          fönster.
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
              onClick={() =>
                addOpening({
                  kind: 'door',
                  wallId: wall.id,
                  offset: 0.5,
                  width: 0.9,
                  height: 2.1,
                  elevation: 0,
                })
              }
            >
              + Dörr
            </button>
            <button
              type="button"
              className="btn"
              onClick={() =>
                addOpening({
                  kind: 'window',
                  wallId: wall.id,
                  offset: 0.8,
                  width: 1.2,
                  height: 1.2,
                  elevation: 0.9,
                })
              }
            >
              + Fönster
            </button>
          </div>
          {wallOpenings.length === 0 && (
            <p className="hint">Inga dörrar eller fönster på den här väggen ännu.</p>
          )}
          {wallOpenings.map((o) => (
            <OpeningCard key={o.id} opening={o} wall={wall} />
          ))}
        </>
      )}
      {otherOpenings.length > 0 && (
        <>
          <p className="hint">{wall ? 'Övriga öppningar:' : 'Alla öppningar:'}</p>
          <ul className="opening-list">
            {otherOpenings.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  onClick={() => select({ kind: 'wall', id: o.wallId })}
                  title="Markera väggen"
                >
                  {o.kind === 'door' ? 'Dörr' : 'Fönster'} · {wallLabel(walls, o.wallId)}
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
        <span className={`chip ${o.kind}`}>{o.kind === 'door' ? 'Dörr' : 'Fönster'}</span>
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
          value={Math.round(o.offset * 100)}
          max={Math.max(Math.round((len - o.width) * 100), 0)}
          step={1}
          onChange={(v) => updateOpening(o.id, { offset: v / 100 })}
        />
        <NumberField
          label="Bredd"
          value={Math.round(o.width * 100)}
          min={10}
          max={Math.round(len * 100)}
          step={1}
          onChange={(v) => updateOpening(o.id, { width: v / 100 })}
        />
        <NumberField
          label="Höjd"
          value={Math.round(o.height * 100)}
          min={10}
          max={Math.round(room.height * 100)}
          step={1}
          onChange={(v) => updateOpening(o.id, { height: v / 100 })}
        />
        {o.kind === 'window' && (
          <NumberField
            label="Över golv"
            value={Math.round(o.elevation * 100)}
            max={Math.round(room.height * 100)}
            step={1}
            onChange={(v) => updateOpening(o.id, { elevation: v / 100 })}
          />
        )}
      </div>
      <p className="hint">Position mäts från väggens startpunkt sett inifrån rummet.</p>
    </div>
  );
}
