import { useDesignStore } from '../../store/useDesignStore';
import { useUiStore } from '../../store/useUiStore';
import { useSelectedWall } from '../../store/selectors';
import { SelBar, SelBarColor } from './SelBar';

/**
 * Action bar for a selected wall (3D view). Mirrors the furniture selection bar:
 * a compact pill whose only job is recolouring the walls — the counterpart to
 * clicking the floor for the floor colour.
 *
 * Wall colour is a single colour per furnishing proposal (`design.wallColor`), so
 * the swatch here recolours every wall of the current proposal, not just the
 * selected one; a different proposal of the same room can use another colour.
 */
export function WallBar() {
  const appView = useUiStore((s) => s.appView);

  const wall = useSelectedWall();
  const wallColor = useDesignStore((s) => s.design.wallColor);
  const setColors = useDesignStore((s) => s.setColors);

  if (appView !== 'furnish' || !wall) return null;

  return (
    <SelBar label="Wall actions">
      <SelBarColor
        label="Colour"
        title="Wall colour (applies to every wall)"
        value={wallColor}
        ariaLabel="Wall colour"
        onChange={(wallColor) => setColors({ wallColor })}
      />
    </SelBar>
  );
}
