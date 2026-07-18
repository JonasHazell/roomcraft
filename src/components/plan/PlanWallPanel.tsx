import { useEffect, useState, type Ref } from 'react';
import {
  defaultOpening,
  floorPolygon,
  formatCm,
  polygonBounds,
  wallLabel,
  wallLen,
} from '../../lib/polygon';
import type { OpeningKind, WallOpening } from '../../types';
import { useDesignStore } from '../../store/useDesignStore';
import { useSelectedWall } from '../../store/selectors';
import { NumberField } from '../panel/fields';
import { Icon } from '../ui/Icon';

/**
 * Fine-tuning in cm for the selected wall in the floor plan: its length (and, for
 * an interior wall, its position) plus the doors and windows on it.
 */
export function PlanWallPanel({ ref }: { ref?: Ref<HTMLDivElement> }) {
  const walls = useDesignStore((s) => s.design.walls);
  const openings = useDesignStore((s) => s.design.openings);
  const resizeWall = useDesignStore((s) => s.resizeWall);
  const moveWall = useDesignStore((s) => s.moveWall);
  const addOpening = useDesignStore((s) => s.addOpening);
  const wall = useSelectedWall();
  // Which opening is expanded for editing; local because openings aren't part of
  // the global selection (which drives walls and furniture).
  const [editingId, setEditingId] = useState<string | null>(null);
  // A heads-up when the last Length commit shrank/repositioned a door or window on
  // this wall to keep it fitting — cleared whenever the selected wall changes.
  const [lengthNotice, setLengthNotice] = useState<string | null>(null);
  useEffect(() => setLengthNotice(null), [wall?.id]);
  if (!wall) return null;

  const lenCm = Math.round(wallLen(wall) * 100);
  const vertical = wall.a.x === wall.b.x;
  const bounds = polygonBounds(floorPolygon(walls));
  const distCm = Math.round((vertical ? wall.a.x - bounds.minX : wall.a.z - bounds.minZ) * 100);
  const wallOpenings = openings.filter((o) => o.wallId === wall.id);

  const add = (kind: OpeningKind) => {
    const id = addOpening(defaultOpening(kind, wall.id));
    // Open the new opening straight away so it can be positioned without a hunt.
    if (id) setEditingId(id);
  };

  // Length only ever *reclamps* a wall's doors/windows to fit (shrinks width
  // and/or nudges offset) rather than deleting them — but a shrink is silent and
  // permanent, so once committed, tell the user which openings it touched. Diffed
  // against a snapshot taken right before the resize, so the message reflects
  // exactly what this edit did, not a prediction.
  const commitLength = (cm: number) => {
    const before = wallOpenings;
    resizeWall(wall.id, cm / 100);
    const after = useDesignStore.getState().design.openings;
    const affected = before.filter((o) => {
      const match = after.find((a) => a.id === o.id);
      return match && (match.width !== o.width || match.offset !== o.offset);
    });
    setLengthNotice(affected.length > 0 ? describeAffected(affected) : null);
  };

  return (
    <div className="plan-wall-panel" ref={ref}>
      <p className="plan-wall-title">
        <strong>{wallLabel(walls, wall.id)}</strong> · {formatCm(wallLen(wall))}
      </p>
      <div className="plan-wall-scroll">
        <div className="field-grid">
          <NumberField
            label="Length"
            value={lenCm}
            min={10}
            max={3000}
            step={1}
            suffix="cm"
            commitOnBlur
            onChange={commitLength}
          />
          {wall.kind === 'interior' && (
            <NumberField
              label={vertical ? 'From left' : 'From top'}
              value={distCm}
              min={0}
              max={3000}
              step={1}
              suffix="cm"
              onChange={(cm) => moveWall(wall.id, (vertical ? bounds.minX : bounds.minZ) + cm / 100)}
            />
          )}
        </div>
        {lengthNotice && <p className="hint">{lengthNotice}</p>}

        {/* Doors & windows on this wall — add one, then tune its position and size. */}
        <div className="opening-editor">
          <div className="opening-add">
            <button type="button" className="btn" onClick={() => add('door')}>
              <Icon name="door" /> Add door
            </button>
            <button type="button" className="btn" onClick={() => add('window')}>
              <Icon name="window" /> Add window
            </button>
          </div>
          {wallOpenings.length > 0 && (
            <ul className="opening-list">
              {wallOpenings.map((o) => (
                <OpeningRow
                  key={o.id}
                  opening={o}
                  wallLenCm={lenCm}
                  expanded={editingId === o.id}
                  onToggle={() => setEditingId(editingId === o.id ? null : o.id)}
                  onClosed={() => setEditingId(null)}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

/** Builds the Length-field notice naming which openings a resize just touched. */
function describeAffected(affected: WallOpening[]): string {
  const doors = affected.filter((o) => o.kind === 'door').length;
  const windows = affected.filter((o) => o.kind === 'window').length;
  const parts: string[] = [];
  if (doors) parts.push(`${doors} door${doors > 1 ? 's' : ''}`);
  if (windows) parts.push(`${windows} window${windows > 1 ? 's' : ''}`);
  const noun = affected.length > 1 ? 'them' : 'it';
  return `This length resized ${parts.join(' and ')} on this wall to fit — check ${noun} before continuing.`;
}

/** One opening as a collapsible row: a summary line that expands to its fields. */
function OpeningRow({
  opening: o,
  wallLenCm,
  expanded,
  onToggle,
  onClosed,
}: {
  opening: WallOpening;
  wallLenCm: number;
  expanded: boolean;
  onToggle: () => void;
  onClosed: () => void;
}) {
  const roomHeight = useDesignStore((s) => s.design.room.height);
  const updateOpening = useDesignStore((s) => s.updateOpening);
  const removeOpening = useDesignStore((s) => s.removeOpening);
  const heightCm = Math.round(roomHeight * 100);
  const label = o.kind === 'door' ? 'Door' : 'Window';

  return (
    <li>
      <button
        type="button"
        className="opening-summary"
        aria-expanded={expanded}
        onClick={onToggle}
      >
        <Icon name={o.kind} /> {label} · {formatCm(o.width)}
      </button>
      {expanded && (
        <div className="opening-edit">
          <div className="field-grid">
            <NumberField
              label="From start"
              value={Math.round(o.offset * 100)}
              min={0}
              max={wallLenCm}
              step={1}
              suffix="cm"
              commitOnBlur
              onChange={(cm) => updateOpening(o.id, { offset: cm / 100 })}
            />
            <NumberField
              label="Width"
              value={Math.round(o.width * 100)}
              min={10}
              max={wallLenCm}
              step={1}
              suffix="cm"
              commitOnBlur
              onChange={(cm) => updateOpening(o.id, { width: cm / 100 })}
            />
            <NumberField
              label="Height"
              value={Math.round(o.height * 100)}
              min={10}
              max={heightCm}
              step={1}
              suffix="cm"
              commitOnBlur
              onChange={(cm) => updateOpening(o.id, { height: cm / 100 })}
            />
            {o.kind === 'window' && (
              <NumberField
                label="Floor height"
                value={Math.round(o.elevation * 100)}
                min={0}
                max={heightCm}
                step={1}
                suffix="cm"
                commitOnBlur
                onChange={(cm) => updateOpening(o.id, { elevation: cm / 100 })}
              />
            )}
          </div>
          <button
            type="button"
            className="opening-remove"
            onClick={() => {
              removeOpening(o.id);
              onClosed();
            }}
          >
            Remove {label.toLowerCase()}
          </button>
        </div>
      )}
    </li>
  );
}
