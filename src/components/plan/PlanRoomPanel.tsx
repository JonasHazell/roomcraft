import { floorPolygon } from '../../lib/polygon';
import { templateArea } from '../../lib/roomTemplates';
import { useDesignStore } from '../../store/useDesignStore';
import { CompassPicker, NumberField } from '../panel/fields';

/**
 * Room-wide dimensions edited in the floor plan. Ceiling height lives here (not
 * in the 3D view) because it belongs with the room's measurements; floor and
 * wall colours are set by clicking those surfaces in the 3D view instead. Total
 * floor area sits alongside it as a read-only readout, reusing the same
 * `templateArea` math the New Room picker uses for its template cards (applied
 * to the room's own outline instead of a template's) so the figure reads the
 * same way in both places, and updating live as the outline changes. The
 * orientation picker sits below: which way the room faces, left unset by
 * default so existing rooms are never forced to answer it, and used by
 * daylight-dependent validation rules (e.g. COL-03) once set.
 */
export function PlanRoomPanel() {
  const height = useDesignStore((s) => s.design.room.height);
  const orientation = useDesignStore((s) => s.design.room.orientation);
  const walls = useDesignStore((s) => s.design.walls);
  const setRoom = useDesignStore((s) => s.setRoom);
  const area = templateArea(floorPolygon(walls));

  return (
    <div className="plan-room-panel">
      <div className="field-grid">
        <NumberField
          label="Ceiling height"
          value={Math.round(height * 100)}
          min={200}
          max={600}
          step={1}
          suffix="cm"
          onChange={(v) => setRoom({ height: v / 100 })}
          commitOnBlur
        />
        <div className="field">
          <span className="field-label">Floor area</span>
          <span className="field-static">{area}</span>
        </div>
      </div>
      <div className="field">
        <span className="field-label">Orientation</span>
        <CompassPicker value={orientation} onChange={(dir) => setRoom({ orientation: dir })} />
      </div>
    </div>
  );
}
