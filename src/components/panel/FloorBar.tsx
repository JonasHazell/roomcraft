import { MATERIAL_CHOICES } from '../../lib/materials';
import { useDesignStore } from '../../store/useDesignStore';
import { useUiStore } from '../../store/useUiStore';
import { SelBar, SelBarColor, SelBarDivider, SelBarSelect } from './SelBar';

/**
 * Action bar for the selected floor (3D view). Clicking the floor selects it and
 * surfaces this pill, whose only job is recolouring the floor — the counterpart
 * to clicking a wall for the wall colour.
 */
export function FloorBar() {
  const appView = useUiStore((s) => s.appView);
  const selection = useUiStore((s) => s.selection);
  const floorColor = useDesignStore((s) => s.design.floorColor);
  const floorMaterial = useDesignStore((s) => s.design.floorMaterial);
  const setColors = useDesignStore((s) => s.setColors);

  if (appView !== 'furnish' || selection?.kind !== 'floor') return null;

  return (
    <SelBar label="Floor actions">
      <SelBarColor
        label="Floor colour"
        title="Floor colour"
        value={floorColor}
        ariaLabel="Floor colour"
        onChange={(floorColor) => setColors({ floorColor })}
      />
      <SelBarDivider />
      <SelBarSelect
        label="Material"
        title="Floor material (applies to the whole floor)"
        value={floorMaterial}
        ariaLabel="Floor material"
        choices={MATERIAL_CHOICES}
        onChange={(floorMaterial) => setColors({ floorMaterial })}
      />
    </SelBar>
  );
}
