import { useDesignStore } from '../../store/useDesignStore';
import { NumberField } from '../panel/fields';

/**
 * Room-wide dimensions edited in the floor plan. Ceiling height lives here (not
 * in the 3D view) because it belongs with the room's measurements; floor and
 * wall colours are set by clicking those surfaces in the 3D view instead.
 */
export function PlanRoomPanel() {
  const height = useDesignStore((s) => s.design.room.height);
  const setRoom = useDesignStore((s) => s.setRoom);

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
        />
      </div>
    </div>
  );
}
