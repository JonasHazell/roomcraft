import { useDesignStore } from '../../store/useDesignStore';
import { useUiStore } from '../../store/useUiStore';

/**
 * Action bar for the selected floor (3D view). Clicking the floor selects it and
 * surfaces this pill, whose only job is recolouring the floor — the counterpart
 * to clicking a wall for the wall colour.
 */
export function FloorBar() {
  const mode = useUiStore((s) => s.mode);
  const selection = useUiStore((s) => s.selection);
  const select = useUiStore((s) => s.select);
  const floorColor = useDesignStore((s) => s.design.room.floorColor);
  const setRoom = useDesignStore((s) => s.setRoom);

  if (mode !== '3d' || selection?.kind !== 'floor') return null;

  return (
    <div className="selection-bar-wrap">
      <div className="selection-bar" role="toolbar" aria-label="Floor actions">
        <label className="sel-action sel-color" title="Floor colour">
          <input
            type="color"
            className="sel-color-input"
            value={floorColor}
            aria-label="Floor colour"
            onChange={(e) => setRoom({ floorColor: e.target.value })}
          />
          <span className="sel-label">Floor colour</span>
        </label>
        <span className="sel-divider" aria-hidden="true" />
        <button
          type="button"
          className="sel-action"
          title="Deselect the floor"
          aria-label="Done"
          onClick={() => select(null)}
        >
          <span className="sel-icon" aria-hidden="true">
            ✓
          </span>
          <span className="sel-label">Done</span>
        </button>
      </div>
    </div>
  );
}
