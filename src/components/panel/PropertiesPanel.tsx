import { useDesignStore } from '../../store/useDesignStore';
import { useSelectedFurniture } from '../../store/selectors';
import { formatCm } from '../../lib/polygon';
import { nearestPieceDistance } from '../../lib/furnitureDistance';
import { FurnitureFields } from './FurnitureFields';

/**
 * The edit form shown in the furniture dialog's body: name, size, colour, etc.
 * "Save to library" lives in the dialog footer (see FurnitureDialog) so it stays
 * visible even when this form scrolls on short screens.
 */
export function PropertiesPanel() {
  const selected = useSelectedFurniture();
  const updateFurniture = useDesignStore((s) => s.updateFurniture);
  const furniture = useDesignStore((s) => s.design.furniture);

  if (!selected) {
    return <p className="hint">Select a piece of furniture in the 3D view to edit it.</p>;
  }

  // Read straight from live store state (every other piece's current
  // position/rotation/size) so this recomputes on every render — while dragging,
  // rotating or resizing — the same way the score badge stays live. Never cache
  // a stale distance.
  const pieceDistance = nearestPieceDistance(
    selected,
    furniture.filter((f) => f.id !== selected.id),
  );
  const distanceText = pieceDistance != null ? `${formatCm(pieceDistance)} to nearest piece` : '';

  return (
    <div className="stack">
      {distanceText && (
        <div className="field">
          <span className="field-label">Distance</span>
          <span className="field-static">{distanceText}</span>
        </div>
      )}
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
