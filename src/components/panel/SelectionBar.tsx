import { useDesignStore } from '../../store/useDesignStore';
import { useUiStore } from '../../store/useUiStore';

/**
 * Action bar for the selected furniture piece. It surfaces the most-used actions
 * (rotate, duplicate, delete) in a compact pill pinned to the bottom of the
 * viewport — on both desktop and mobile. "More" opens the full furniture dialog
 * (name, size, colour) pre-filled with this piece's values — the same box used
 * when the piece was added.
 */
export function SelectionBar() {
  const appView = useUiStore((s) => s.appView);
  const selection = useUiStore((s) => s.selection);
  const select = useUiStore((s) => s.select);
  const openEditFurniture = useUiStore((s) => s.openEditFurniture);
  const dialog = useUiStore((s) => s.furnitureDialog);
  const selected = useDesignStore((s) =>
    selection?.kind === 'furniture'
      ? s.design.furniture.find((f) => f.id === selection.id)
      : undefined,
  );
  const updateFurniture = useDesignStore((s) => s.updateFurniture);
  const duplicateFurniture = useDesignStore((s) => s.duplicateFurniture);
  const removeFurniture = useDesignStore((s) => s.removeFurniture);

  if (appView !== 'furnish' || selection?.kind !== 'furniture' || !selected) return null;

  const editing = dialog?.mode === 'edit' && dialog.id === selected.id;

  return (
    <div className="selection-bar-wrap">
      <div className="selection-bar" role="toolbar" aria-label="Furniture actions">
        <button
          type="button"
          className="sel-action"
          title="Rotate 90° left"
          aria-label="Rotate 90 degrees left"
          onClick={() =>
            updateFurniture(selected.id, { rotationY: selected.rotationY + Math.PI / 2 })
          }
        >
          <span className="sel-icon" aria-hidden="true">
            ⟲
          </span>
          <span className="sel-label">Left</span>
        </button>
        <button
          type="button"
          className="sel-action"
          title="Rotate 90° right"
          aria-label="Rotate 90 degrees right"
          onClick={() =>
            updateFurniture(selected.id, { rotationY: selected.rotationY - Math.PI / 2 })
          }
        >
          <span className="sel-icon" aria-hidden="true">
            ⟳
          </span>
          <span className="sel-label">Right</span>
        </button>
        <button
          type="button"
          className="sel-action"
          title="Create an identical piece with the same dimensions"
          aria-label="Duplicate"
          onClick={() => {
            const newId = duplicateFurniture(selected.id);
            if (newId) select({ kind: 'furniture', id: newId });
          }}
        >
          <span className="sel-icon" aria-hidden="true">
            ⧉
          </span>
          <span className="sel-label">Duplicate</span>
        </button>
        <button
          type="button"
          className="sel-action sel-danger"
          title="Delete this piece"
          aria-label="Delete"
          onClick={() => {
            removeFurniture(selected.id);
            select(null);
          }}
        >
          <span className="sel-icon" aria-hidden="true">
            ✕
          </span>
          <span className="sel-label">Delete</span>
        </button>
        <span className="sel-divider" aria-hidden="true" />
        <button
          type="button"
          className={`sel-action${editing ? ' sel-active' : ''}`}
          title="More settings"
          aria-label="More settings"
          aria-expanded={editing}
          onClick={() => openEditFurniture(selected.id)}
        >
          <span className="sel-icon" aria-hidden="true">
            ⋯
          </span>
          <span className="sel-label">More</span>
        </button>
      </div>
    </div>
  );
}
