import { useUiStore } from '../../store/useUiStore';

/**
 * The "+" toolbar for adding furniture. Styled like the other floating toolbars
 * (mode tabs, selection bar) and pinned near the bottom of the 3D viewport, on
 * both desktop and mobile. Opens the furniture dialog's type picker.
 */
export function AddFurnitureButton() {
  const openAddFurniture = useUiStore((s) => s.openAddFurniture);

  return (
    <button
      type="button"
      className="add-furniture-btn"
      title="Add a piece of furniture"
      aria-label="Add furniture"
      onClick={openAddFurniture}
    >
      <span className="add-furniture-icon" aria-hidden="true">
        ＋
      </span>
      <span className="add-furniture-label">Add furniture</span>
    </button>
  );
}
