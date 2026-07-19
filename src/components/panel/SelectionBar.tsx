import { FURNITURE_PARTS, normalizeMaterials, primaryPart } from '../../lib/furnitureParts';
import { MATERIAL_CHOICES } from '../../lib/materials';
import { COARSE_POINTER, useMediaQuery } from '../../lib/useMediaQuery';
import { useDesignStore } from '../../store/useDesignStore';
import { useUiStore } from '../../store/useUiStore';
import { useSelectedFurniture, useSelectedFurnitureIds } from '../../store/selectors';
import { SelBar, SelBarButton, SelBarDivider, SelBarSelect } from './SelBar';
import { Icon } from '../ui/Icon';

/**
 * Action bar for the selected furniture — one piece, or a multi-selection built
 * with shift/ctrl-click (desktop) or the "Select multiple" toggle below (touch).
 * It surfaces the most-used actions (duplicate, delete) in a compact pill pinned
 * to the bottom of the viewport, and runs them over every selected piece when
 * there's more than one. Rotation is handled by the in-scene ring handle (and the
 * R / Shift+R shortcuts) and colour/material fine-tuning lives under "More" —
 * both are single-piece-only, so they're hidden for a multi-selection (out of
 * scope for v1's move/duplicate/delete group actions). "More" opens the full
 * furniture dialog pre-filled with the piece's values.
 */
export function SelectionBar() {
  const appView = useUiStore((s) => s.appView);
  const select = useUiStore((s) => s.select);
  const openEditFurniture = useUiStore((s) => s.openEditFurniture);
  const dialog = useUiStore((s) => s.furnitureDialog);
  const selected = useSelectedFurniture();
  const selectedIds = useSelectedFurnitureIds();
  const multiSelectMode = useUiStore((s) => s.multiSelectMode);
  const setMultiSelectMode = useUiStore((s) => s.setMultiSelectMode);
  const updateFurniture = useDesignStore((s) => s.updateFurniture);
  const duplicateFurniture = useDesignStore((s) => s.duplicateFurniture);
  const removeFurniture = useDesignStore((s) => s.removeFurniture);
  // The furniture bar is the busiest one; the inline material picker only fits
  // alongside the actions on wider screens. On phones it stays under "More".
  const showMaterial = useMediaQuery('(min-width: 620px)');
  // A mouse already has shift/ctrl-click to build a multi-selection; the
  // "Select multiple" toggle is the touch equivalent, so it only needs to show
  // up where there's no modifier key to press.
  const coarse = useMediaQuery(COARSE_POINTER);

  if (appView !== 'furnish' || selectedIds.length === 0) return null;

  const multi = selectedIds.length > 1;
  const editing = !!selected && dialog?.mode === 'edit' && dialog.id === selected.id;

  return (
    <SelBar
      label={multi ? `Furniture actions (${selectedIds.length} selected)` : 'Furniture actions'}
    >
      <SelBarButton
        icon={<Icon name="copy" />}
        label="Duplicate"
        title={
          multi
            ? 'Create identical copies of every selected piece'
            : 'Create an identical piece with the same dimensions'
        }
        ariaLabel="Duplicate"
        onClick={() => {
          const newIds = selectedIds
            .map((id) => duplicateFurniture(id))
            .filter((newId): newId is string => !!newId);
          if (newIds.length === 0) return;
          select(
            newIds.length > 1
              ? { kind: 'furniture-multi', ids: newIds }
              : { kind: 'furniture', id: newIds[0] },
          );
        }}
      />
      <SelBarButton
        icon={<Icon name="x" />}
        label="Delete"
        title={multi ? 'Delete every selected piece' : 'Delete this piece'}
        ariaLabel="Delete"
        danger
        onClick={() => {
          selectedIds.forEach((id) => removeFurniture(id));
          select(null);
        }}
      />
      {selected && showMaterial && (
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
      {coarse && (
        <>
          <SelBarDivider />
          <SelBarButton
            icon={<Icon name="layers" />}
            label="Select multiple"
            title={
              multiSelectMode
                ? 'Stop adding to the selection'
                : 'Tap other pieces to add them to this selection'
            }
            ariaLabel="Select multiple"
            expandable
            active={multiSelectMode}
            onClick={() => setMultiSelectMode(!multiSelectMode)}
          />
        </>
      )}
      {selected && (
        <>
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
        </>
      )}
    </SelBar>
  );
}
