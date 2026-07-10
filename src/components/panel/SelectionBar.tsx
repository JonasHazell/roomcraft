import { useDesignStore } from '../../store/useDesignStore';
import { useUiStore } from '../../store/useUiStore';
import { useSelectedFurniture } from '../../store/selectors';
import { SelBar, SelBarButton, SelBarDivider } from './SelBar';

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

  if (appView !== 'furnish' || !selected) return null;

  const editing = dialog?.mode === 'edit' && dialog.id === selected.id;

  return (
    <SelBar label="Furniture actions" history={false}>
      <SelBarButton
        icon="⟲"
        label="Left"
        title="Rotate 90° left"
        ariaLabel="Rotate 90 degrees left"
        onClick={() => updateFurniture(selected.id, { rotationY: selected.rotationY + Math.PI / 2 })}
      />
      <SelBarButton
        icon="⟳"
        label="Right"
        title="Rotate 90° right"
        ariaLabel="Rotate 90 degrees right"
        onClick={() => updateFurniture(selected.id, { rotationY: selected.rotationY - Math.PI / 2 })}
      />
      <SelBarButton
        icon="⧉"
        label="Duplicate"
        title="Create an identical piece with the same dimensions"
        ariaLabel="Duplicate"
        onClick={() => {
          const newId = duplicateFurniture(selected.id);
          if (newId) select({ kind: 'furniture', id: newId });
        }}
      />
      <SelBarButton
        icon="✕"
        label="Delete"
        title="Delete this piece"
        ariaLabel="Delete"
        danger
        onClick={() => {
          removeFurniture(selected.id);
          select(null);
        }}
      />
      <SelBarDivider />
      <SelBarButton
        icon="⋯"
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
