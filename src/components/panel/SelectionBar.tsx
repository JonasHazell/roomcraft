import { useEffect, useState } from 'react';
import { useDesignStore } from '../../store/useDesignStore';
import { useUiStore } from '../../store/useUiStore';
import { PropertiesPanel } from './PropertiesPanel';

/**
 * Action bar for the selected furniture piece. Instead of unfurling the whole
 * editor the moment something is selected, we surface only the most-used
 * actions (rotate, duplicate, delete) in a compact bar pinned to the bottom of
 * the viewport — on both desktop and mobile. A "More" toggle expands the full
 * editor (name, size, colour, save to library) in a panel above the bar, the
 * same controls that used to live in the sidebar / mobile sheet.
 */
export function SelectionBar() {
  const mode = useUiStore((s) => s.mode);
  const selection = useUiStore((s) => s.selection);
  const select = useUiStore((s) => s.select);
  const selected = useDesignStore((s) =>
    selection?.kind === 'furniture'
      ? s.design.furniture.find((f) => f.id === selection.id)
      : undefined,
  );
  const updateFurniture = useDesignStore((s) => s.updateFurniture);
  const duplicateFurniture = useDesignStore((s) => s.duplicateFurniture);
  const removeFurniture = useDesignStore((s) => s.removeFurniture);
  const [expanded, setExpanded] = useState(false);

  const selectedId = selection?.kind === 'furniture' ? selection.id : null;
  // Collapse back to the bar whenever the selection changes or clears, so a
  // freshly selected piece always starts in the compact state.
  useEffect(() => {
    setExpanded(false);
  }, [selectedId]);

  if (mode !== '3d' || selection?.kind !== 'furniture' || !selected) return null;

  return (
    <div className="selection-bar-wrap">
      {expanded && (
        <div className="selection-panel" role="dialog" aria-label="Furniture settings">
          <div className="selection-panel-head">
            <span className="selection-panel-title">Selected furniture</span>
            <button
              type="button"
              className="btn-icon"
              aria-label="Close settings"
              onClick={() => setExpanded(false)}
            >
              ✕
            </button>
          </div>
          <div className="selection-panel-body">
            <PropertiesPanel />
          </div>
        </div>
      )}
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
          className={`sel-action${expanded ? ' sel-active' : ''}`}
          title="More settings"
          aria-label="More settings"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
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
