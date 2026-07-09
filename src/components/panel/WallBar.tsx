import { defaultOpening, OPENING_ICON } from '../../lib/polygon';
import { useDesignStore } from '../../store/useDesignStore';
import { useUiStore } from '../../store/useUiStore';
import { useSelectedWall } from '../../store/selectors';
import { SelBar, SelBarButton, SelBarColor, SelBarDivider } from './SelBar';

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
  const select = useUiStore((s) => s.select);
  const openPanel = useUiStore((s) => s.openPanel);
  const panel = useUiStore((s) => s.panel);

  const wall = useSelectedWall();
  const wallColor = useDesignStore((s) => s.design.wallColor);
  const setColors = useDesignStore((s) => s.setColors);
  const addOpening = useDesignStore((s) => s.addOpening);
  const removeWall = useDesignStore((s) => s.removeWall);

  if (appView !== 'furnish' || !wall) return null;

  return (
    <SelBar label="Wall actions" history={false}>
      <SelBarColor
        label="Colour"
        title="Wall colour (applies to every wall)"
        value={wallColor}
        ariaLabel="Wall colour"
        onChange={(wallColor) => setColors({ wallColor })}
      />
      <SelBarDivider />
      <SelBarButton
        icon={OPENING_ICON.door}
        label="Door"
        title="Add a door to this wall"
        ariaLabel="Add door"
        onClick={() => addOpening(defaultOpening('door', wall.id))}
      />
      <SelBarButton
        icon={OPENING_ICON.window}
        label="Window"
        title="Add a window to this wall"
        ariaLabel="Add window"
        onClick={() => addOpening(defaultOpening('window', wall.id))}
      />
      <SelBarButton
        icon="⋯"
        label="Openings"
        title="Edit doors and windows on this wall"
        ariaLabel="Openings"
        expandable
        active={panel === 'openings'}
        onClick={() => openPanel('openings')}
      />
      {wall.kind === 'interior' && (
        <>
          <SelBarDivider />
          <SelBarButton
            icon="✕"
            label="Delete"
            title="Delete this interior wall"
            ariaLabel="Delete wall"
            danger
            onClick={() => {
              removeWall(wall.id);
              select(null);
            }}
          />
        </>
      )}
    </SelBar>
  );
}
