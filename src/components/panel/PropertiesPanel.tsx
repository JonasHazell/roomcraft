import { useDesignStore } from '../../store/useDesignStore';
import { useSelectedFurniture } from '../../store/selectors';
import { COARSE_POINTER, useMediaQuery } from '../../lib/useMediaQuery';
import { FurnitureFields } from './FurnitureFields';

/**
 * The edit form shown in the furniture dialog's body: name, size, colour, etc.
 * "Save to library" lives in the dialog footer (see FurnitureDialog) so it stays
 * visible even when this form scrolls on short screens.
 */
export function PropertiesPanel() {
  const selected = useSelectedFurniture();
  const updateFurniture = useDesignStore((s) => s.updateFurniture);
  const coarse = useMediaQuery(COARSE_POINTER);

  if (!selected) {
    return <p className="hint">Click a piece of furniture in the 3D view to edit it.</p>;
  }

  // The piece's clearances to the walls and its neighbours are shown directly in
  // the 3D view as dashed dimension runs (see SelectionDimensions), where they
  // read against the things they measure to — no numeric readout is needed here.
  return (
    <div className="stack">
      <FurnitureFields
        value={selected}
        onChange={(patch) => updateFurniture(selected.id, patch)}
      />
      {!coarse && (
        <p className="hint">
          Shortcuts: R rotates right · Shift+R left · Ctrl+D duplicates · Delete removes · Esc
          deselects
        </p>
      )}
    </div>
  );
}
