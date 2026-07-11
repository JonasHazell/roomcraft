import { MATERIAL_CHOICES, normalizeMaterial } from '../../lib/materials';
import { useMediaQuery } from '../../lib/useMediaQuery';
import { useDesignStore } from '../../store/useDesignStore';
import { useUiStore } from '../../store/useUiStore';
import { useSelectedFurniture } from '../../store/selectors';
import { SelBar, SelBarButton, SelBarDivider, SelBarSelect } from './SelBar';
import { Icon } from '../ui/Icon';

/**
 * Action bar for the selected furniture piece. It surfaces the most-used actions
 * (rotate, duplicate, delete) in a compact pill pinned to the bottom of the
 * viewport — on both desktop and mobile. Colour lives under "More", alongside the
 * piece's name and size, so the bar stays focused on quick actions. "More" opens
 * the full furniture dialog pre-filled with this piece's values.
 */
export function SelectionBar() {
  const appView = useUiStore((s) => s.appView);
  const select = useUiStore((s) => s.select);
  const openEditFurniture = useUiStore((s) => s.openEditFurniture);
  const dialog = useUiStore((s) => s.furnitureDialog);
  const selected = useSelectedFurniture();
  const updateFurniture = useDesignStore((s) => s.updateFurniture);
  const duplicateFurniture = useDesignStore((s) => s.duplicateFurniture);
  const removeFurniture = useDesignStore((s) => s.removeFurniture);
  // The furniture bar is the busiest one; the inline material picker only fits
  // alongside the actions on wider screens. On phones it stays under "More".
  const showMaterial = useMediaQuery('(min-width: 620px)');

  if (appView !== 'furnish' || !selected) return null;

  const editing = dialog?.mode === 'edit' && dialog.id === selected.id;

  return (
    <SelBar label="Furniture actions">
      <SelBarButton
        icon={<Icon name="rotate-ccw" />}
        label="Left"
        title="Rotate 90° left"
        ariaLabel="Rotate 90 degrees left"
        onClick={() => updateFurniture(selected.id, { rotationY: selected.rotationY + Math.PI / 2 })}
      />
      <SelBarButton
        icon={<Icon name="rotate-cw" />}
        label="Right"
        title="Rotate 90° right"
        ariaLabel="Rotate 90 degrees right"
        onClick={() => updateFurniture(selected.id, { rotationY: selected.rotationY - Math.PI / 2 })}
      />
      <SelBarButton
        icon={<Icon name="copy" />}
        label="Duplicate"
        title="Create an identical piece with the same dimensions"
        ariaLabel="Duplicate"
        onClick={() => {
          const newId = duplicateFurniture(selected.id);
          if (newId) select({ kind: 'furniture', id: newId });
        }}
      />
      <SelBarButton
        icon={<Icon name="x" />}
        label="Delete"
        title="Delete this piece"
        ariaLabel="Delete"
        danger
        onClick={() => {
          removeFurniture(selected.id);
          select(null);
        }}
      />
      {showMaterial && (
        <>
          <SelBarDivider />
          <SelBarSelect
            label="Material"
            title="Surface finish for this piece"
            value={normalizeMaterial(selected.material)}
            ariaLabel="Furniture material"
            choices={MATERIAL_CHOICES}
            onChange={(material) => updateFurniture(selected.id, { material })}
          />
        </>
      )}
      <SelBarDivider />
      <SelBarButton
        icon={<Icon name="more-horizontal" />}
        label="More"
        title="More settings"
        ariaLabel="More settings"
        expandable
        active={editing}
        onClick={() => openEditFurniture(selected.id)}
      />
    </SelBar>
  );
}
