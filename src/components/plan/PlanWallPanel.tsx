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

/** Finjustering i cm för den markerade väggen i planritningen. */
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
          label="Längd"
          value={lenCm}
          min={10}
          max={3000}
          step={1}
          suffix="cm"
          onChange={(cm) => resizeWall(wall.id, cm / 100)}
        />
        {wall.kind === 'interior' && (
          <NumberField
            label={vertical ? 'Från vänster' : 'Uppifrån'}
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
          ? 'Längden ändras i väggens slutände (pilen); väggen intill följer med.'
          : 'Längden ändras i väggens slutände (pilen).'}
      </p>
      {wall.kind === 'exterior' && (
        <p className="plan-hint">
          Ytterväggar tas inte bort en och en — konturen måste vara sluten. Använd
          ”Rita om ytterväggar…” för att ändra rummets form.
        </p>
      )}
    </div>
  );
}
