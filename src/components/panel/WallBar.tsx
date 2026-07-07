import { defaultOpening, OPENING_ICON } from '../../lib/polygon';
import { useDesignStore } from '../../store/useDesignStore';
import { useUiStore } from '../../store/useUiStore';

/**
 * Action bar for a selected wall (3D view). Mirrors the furniture selection bar:
 * a compact pill with the most-used wall actions — recolour the walls, add a
 * door or window, open the full openings editor, and (for interior walls) delete.
 *
 * Wall colour is a single colour per furnishing proposal (`design.wallColor`), so
 * the swatch here recolours every wall of the current proposal, not just the
 * selected one; a different proposal of the same room can use another colour.
 */
export function WallBar() {
  const appView = useUiStore((s) => s.appView);
  const selection = useUiStore((s) => s.selection);
  const select = useUiStore((s) => s.select);
  const openPanel = useUiStore((s) => s.openPanel);
  const panel = useUiStore((s) => s.panel);

  const wall = useDesignStore((s) =>
    selection?.kind === 'wall' ? s.design.walls.find((w) => w.id === selection.id) : undefined,
  );
  const wallColor = useDesignStore((s) => s.design.wallColor);
  const setColors = useDesignStore((s) => s.setColors);
  const addOpening = useDesignStore((s) => s.addOpening);
  const removeWall = useDesignStore((s) => s.removeWall);

  if (appView !== 'furnish' || selection?.kind !== 'wall' || !wall) return null;

  return (
    <div className="selection-bar-wrap">
      <div className="selection-bar" role="toolbar" aria-label="Wall actions">
        <label className="sel-action sel-color" title="Wall colour (applies to every wall)">
          <input
            type="color"
            className="sel-color-input"
            value={wallColor}
            aria-label="Wall colour"
            onChange={(e) => setColors({ wallColor: e.target.value })}
          />
          <span className="sel-label">Colour</span>
        </label>
        <span className="sel-divider" aria-hidden="true" />
        <button
          type="button"
          className="sel-action"
          title="Add a door to this wall"
          aria-label="Add door"
          onClick={() => addOpening(defaultOpening('door', wall.id))}
        >
          <span className="sel-icon" aria-hidden="true">
            {OPENING_ICON.door}
          </span>
          <span className="sel-label">Door</span>
        </button>
        <button
          type="button"
          className="sel-action"
          title="Add a window to this wall"
          aria-label="Add window"
          onClick={() => addOpening(defaultOpening('window', wall.id))}
        >
          <span className="sel-icon" aria-hidden="true">
            {OPENING_ICON.window}
          </span>
          <span className="sel-label">Window</span>
        </button>
        <button
          type="button"
          className={`sel-action${panel === 'openings' ? ' sel-active' : ''}`}
          title="Edit doors and windows on this wall"
          aria-label="Openings"
          aria-expanded={panel === 'openings'}
          onClick={() => openPanel('openings')}
        >
          <span className="sel-icon" aria-hidden="true">
            ⋯
          </span>
          <span className="sel-label">Openings</span>
        </button>
        {wall.kind === 'interior' && (
          <>
            <span className="sel-divider" aria-hidden="true" />
            <button
              type="button"
              className="sel-action sel-danger"
              title="Delete this interior wall"
              aria-label="Delete wall"
              onClick={() => {
                removeWall(wall.id);
                select(null);
              }}
            >
              <span className="sel-icon" aria-hidden="true">
                ✕
              </span>
              <span className="sel-label">Delete</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
