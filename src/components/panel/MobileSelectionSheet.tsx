import { useUiStore } from '../../store/useUiStore';
import { PropertiesPanel } from './PropertiesPanel';

/**
 * On phones the "Selected furniture" controls are buried at the bottom of the
 * off-canvas drawer, which also hides the 3D view. This surfaces the same
 * editor as a bottom sheet over the scene so edits are visible live. Purely a
 * mobile affordance — CSS hides it on wider / non-touch layouts.
 */
export function MobileSelectionSheet() {
  const mode = useUiStore((s) => s.mode);
  const selection = useUiStore((s) => s.selection);
  const select = useUiStore((s) => s.select);

  if (mode !== '3d' || selection?.kind !== 'furniture') return null;

  return (
    <div className="mobile-sheet" role="dialog" aria-label="Selected furniture">
      <div className="mobile-sheet-head">
        <span className="mobile-sheet-title">Selected furniture</span>
        <button
          type="button"
          className="btn-icon mobile-sheet-close"
          aria-label="Close and deselect"
          onClick={() => select(null)}
        >
          ✕
        </button>
      </div>
      <div className="mobile-sheet-body">
        <PropertiesPanel />
      </div>
    </div>
  );
}
