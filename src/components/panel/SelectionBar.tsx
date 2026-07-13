import { FURNITURE_PARTS, normalizeMaterials, primaryPart } from '../../lib/furnitureParts';
import { MATERIAL_CHOICES } from '../../lib/materials';
import { useMediaQuery } from '../../lib/useMediaQuery';
import { useDesignStore } from '../../store/useDesignStore';
import { useUiStore } from '../../store/useUiStore';
import { useSelectedFurniture } from '../../store/selectors';
import { SelBar, SelBarButton, SelBarDivider, SelBarSelect } from './SelBar';
import { Icon } from '../ui/Icon';

/**
 * Action bar for the selected furniture piece. It surfaces the most-used actions
 * (duplicate, delete) in a compact pill pinned to the bottom of the viewport — on
 * both desktop and mobile. Rotation lives on the 3D rotation handle (which snaps
 * to 15°) and the `R` / `Shift+R` shortcuts, so it's not repeated here. Colour
 * lives under "More", alongside the piece's name and size, so the bar stays
 * focused on quick actions. "More" opens the full furniture dialog pre-filled with
 * this piece's values.
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
            title="Set the finish for the whole piece (fine-tune each part under More)"
            value={
              normalizeMaterials(selected.kind, selected.materials, selected.material)[
                primaryPart(selected.kind)
              ]
            }
            ariaLabel="Furniture material"
            choices={MATERIAL_CHOICES}
            onChange={(m) =>
              updateFurniture(selected.id, {
                materials: Object.fromEntries(
                  FURNITURE_PARTS[selected.kind].map((p) => [p.key, m]),
                ),
              })
            }
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
