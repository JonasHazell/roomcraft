import {
  floorPolygon,
  formatCm,
  polygonBounds,
  wallLabel,
  wallLen,
} from '../../lib/polygon';
import { useDesignStore } from '../../store/useDesignStore';
import { useUiStore } from '../../store/useUiStore';
import { NumberField } from '../panel/fields';

/** Fine-tuning in cm for the selected wall in the floor plan. */
export function PlanWallPanel() {
  const walls = useDesignStore((s) => s.design.walls);
  const resizeWall = useDesignStore((s) => s.resizeWall);
  const moveWall = useDesignStore((s) => s.moveWall);
  const selection = useUiStore((s) => s.selection);
  const wall =
    selection?.kind === 'wall' ? walls.find((w) => w.id === selection.id) : undefined;
  if (!wall) return null;

  const lenCm = Math.round(wallLen(wall) * 100);
  const vertical = wall.a.x === wall.b.x;
  const bounds = polygonBounds(floorPolygon(walls));
  const distCm = Math.round((vertical ? wall.a.x - bounds.minX : wall.a.z - bounds.minZ) * 100);

  return (
    <div className="plan-wall-panel">
      <p className="plan-hint">
        <strong>{wallLabel(walls, wall.id)}</strong> · {formatCm(wallLen(wall))}
      </p>
      <div className="field-grid">
        <NumberField
          label="Length"
          value={lenCm}
          min={10}
          max={3000}
          step={1}
          suffix="cm"
          onChange={(cm) => resizeWall(wall.id, cm / 100)}
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
      <p className="plan-hint">
        {wall.kind === 'exterior'
          ? 'The length changes at the wall’s end (the arrow); the adjacent wall follows.'
          : 'The length changes at the wall’s end (the arrow).'}
      </p>
      {wall.kind === 'exterior' && (
        <p className="plan-hint">
          Exterior walls cannot be deleted one by one — the outline must stay closed. Use
          &ldquo;Redraw exterior walls…&rdquo; to change the shape of the room.
        </p>
      )}
    </div>
  );
}
