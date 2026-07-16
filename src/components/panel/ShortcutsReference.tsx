import { useUiStore } from '../../store/useUiStore';
import { useEscape } from '../../lib/useEscape';
import { Icon } from '../ui/Icon';

/** One row: what the shortcut does, and the key(s) that trigger it. `keys` is an
 *  array of alternatives (rendered joined by "or"); each alternative is itself an
 *  array of keys held together (rendered joined by "+"). */
interface ShortcutRow {
  action: string;
  keys: string[][];
}

// The single source of truth for these bindings is `lib/globalKeydown.ts` — keep
// this list in sync with it rather than guessing at what's wired up.
const ROWS: ShortcutRow[] = [
  { action: 'Undo', keys: [['Ctrl/⌘', 'Z']] },
  { action: 'Redo', keys: [['Ctrl/⌘', 'Shift', 'Z'], ['Ctrl/⌘', 'Y']] },
  { action: 'Rotate selected piece right', keys: [['R']] },
  { action: 'Rotate selected piece left', keys: [['Shift', 'R']] },
  { action: 'Duplicate selected piece', keys: [['Ctrl/⌘', 'D']] },
  { action: 'Delete selected piece or wall', keys: [['Delete'], ['Backspace']] },
  { action: 'Deselect / close', keys: [['Esc']] },
];

/**
 * The keyboard-shortcuts reference: a compact `.modal-sm` listing every binding
 * from `globalKeydown.ts`, opened from the keyboard icon in the room top bar
 * (see App.tsx — not the bottom dock's ActionBar, which has no width to spare at
 * narrow viewports, see ActionBar.tsx). It stays reachable regardless of pointer
 * type or selection state — the previous discoverability was a single hint line
 * in PropertiesPanel that only showed once a piece was already selected and was
 * hidden entirely on touch devices (#227). A static reference only: no
 * remapping, no onboarding tour.
 */
export function ShortcutsReference() {
  const open = useUiStore((s) => s.shortcutsOpen);
  const close = useUiStore((s) => s.closeShortcuts);

  useEscape(close, open);

  if (!open) return null;

  return (
    <div className="modal-backdrop" role="presentation" onClick={close}>
      <div
        className="modal modal-sm"
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <span className="modal-title">Keyboard shortcuts</span>
          <button type="button" className="btn-icon" aria-label="Close" onClick={close}>
            <Icon name="x" />
          </button>
        </div>

        <div className="modal-body">
          <ul className="shortcut-list">
            {ROWS.map((row) => (
              <li className="shortcut-row" key={row.action}>
                <span className="shortcut-action">{row.action}</span>
                <span className="shortcut-keys">
                  {row.keys.map((combo, i) => (
                    <span className="shortcut-combo" key={i}>
                      {i > 0 && <span className="shortcut-or">or</span>}
                      {combo.map((k, j) => (
                        <span key={j}>
                          {j > 0 && <span className="shortcut-plus">+</span>}
                          <kbd className="key">{k}</kbd>
                        </span>
                      ))}
                    </span>
                  ))}
                </span>
              </li>
            ))}
          </ul>
          <p className="hint">
            Undo, redo and Esc work anywhere in a room. The rest act on the current
            selection and are suppressed while typing in a field.
          </p>
        </div>
      </div>
    </div>
  );
}
