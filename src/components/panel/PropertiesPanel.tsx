import { useDesignStore } from '../../store/useDesignStore';
import { useSelectedFurniture } from '../../store/selectors';
import { FurnitureFields } from './FurnitureFields';

/**
 * The edit form shown in the furniture dialog's body: name, size, colour, etc.
 * "Save to library" lives in the dialog footer (see FurnitureDialog) so it stays
 * visible even when this form scrolls on short screens.
 */
export function PropertiesPanel() {
  const selected = useSelectedFurniture();
  const updateFurniture = useDesignStore((s) => s.updateFurniture);

  if (!selected) {
    return <p className="hint">Select a piece of furniture in the 3D view to edit it.</p>;
  }

  return (
    <div className="stack">
      <FurnitureFields
        value={selected}
        onChange={(patch) => updateFurniture(selected.id, patch)}
      />
      {/* The rotate/duplicate/delete shortcuts don't fire while this dialog owns
          the keyboard (see globalKeydown.ts), so a shortcut hint doesn't belong
          here. The full, always-reachable list lives behind the action bar's
          keyboard icon (ShortcutsReference, #227) instead of being duplicated —
          and hidden on touch — in this per-piece panel. */}
    </div>
  );
}
