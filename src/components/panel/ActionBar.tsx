import { useUiStore } from '../../store/useUiStore';

/**
 * The primary action bar shown in the 3D view when nothing is selected. Groups
 * the room-wide actions — add furniture, AI furnishing, validation — into one
 * pill in the same family as the selection bar, pinned to the bottom centre.
 */
export function ActionBar() {
  const mode = useUiStore((s) => s.mode);
  const selection = useUiStore((s) => s.selection);
  const openAddFurniture = useUiStore((s) => s.openAddFurniture);
  const openPanel = useUiStore((s) => s.openPanel);
  const panel = useUiStore((s) => s.panel);

  // Only the empty-selection state; furniture/wall/floor get their own bars.
  if (mode !== '3d' || selection !== null) return null;

  return (
    <div className="selection-bar-wrap">
      <div className="selection-bar" role="toolbar" aria-label="Room actions">
        <button
          type="button"
          className="sel-action"
          title="Add a piece of furniture"
          aria-label="Add furniture"
          onClick={openAddFurniture}
        >
          <span className="sel-icon" aria-hidden="true">
            ＋
          </span>
          <span className="sel-label">Furniture</span>
        </button>
        <span className="sel-divider" aria-hidden="true" />
        <button
          type="button"
          className={`sel-action${panel === 'ai' ? ' sel-active' : ''}`}
          title="Let Claude suggest a furnishing layout"
          aria-label="AI furnishing"
          aria-expanded={panel === 'ai'}
          onClick={() => openPanel('ai')}
        >
          <span className="sel-icon" aria-hidden="true">
            ✨
          </span>
          <span className="sel-label">AI</span>
        </button>
        <button
          type="button"
          className={`sel-action${panel === 'validation' ? ' sel-active' : ''}`}
          title="Check the furnishing against the rule catalog"
          aria-label="Validate"
          aria-expanded={panel === 'validation'}
          onClick={() => openPanel('validation')}
        >
          <span className="sel-icon" aria-hidden="true">
            ✓
          </span>
          <span className="sel-label">Validate</span>
        </button>
      </div>
    </div>
  );
}
