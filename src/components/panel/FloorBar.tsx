import { useDesignStore } from '../../store/useDesignStore';
import { useUiStore } from '../../store/useUiStore';
import { SelBar, SelBarButton, SelBarColor, SelBarDivider } from './SelBar';

/**
 * Action bar for the selected floor (3D view). Clicking the floor selects it and
 * surfaces this pill, whose only job is recolouring the floor — the counterpart
 * to clicking a wall for the wall colour.
 */
export function FloorBar() {
  const appView = useUiStore((s) => s.appView);
  const selection = useUiStore((s) => s.selection);
  const select = useUiStore((s) => s.select);
  const floorColor = useDesignStore((s) => s.design.floorColor);
  const setColors = useDesignStore((s) => s.setColors);

  if (appView !== 'furnish' || selection?.kind !== 'floor') return null;

  return (
    <SelBar label="Floor actions" history={false}>
      <SelBarColor
        label="Floor colour"
        title="Floor colour"
        value={floorColor}
        ariaLabel="Floor colour"
        onChange={(floorColor) => setColors({ floorColor })}
      />
      <SelBarDivider />
      <SelBarButton
        icon="✓"
        label="Done"
        title="Deselect the floor"
        ariaLabel="Done"
        onClick={() => select(null)}
      />
    </SelBar>
  );
}
