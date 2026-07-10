import { useUiStore } from '../../store/useUiStore';
import { useEscape } from '../../lib/useEscape';
import { AiProposalsPanel } from './AiProposalsPanel';
import { ValidationPanel } from './ValidationPanel';

const TITLES = {
  ai: 'AI furnishing',
  validation: 'Validation',
} as const;

/**
 * The floating panel anchored to the right of the 3D viewport. Unlike a centred
 * modal it leaves the scene visible, so validation highlights can be seen while
 * the panel is open. Hosts whichever global panel is active.
 */
export function SidePanel() {
  const appView = useUiStore((s) => s.appView);
  const panel = useUiStore((s) => s.panel);
  const closePanel = useUiStore((s) => s.closePanel);

  // Esc closes the panel. The furniture dialog owns Esc while it's open, and the
  // App-level handler bails out on dialogs too, so only one thing reacts.
  useEscape(() => {
    if (!useUiStore.getState().furnitureDialog) closePanel();
  }, !!panel);

  if (appView !== 'furnish' || !panel) return null;

  return (
    <aside className="side-panel" aria-label={TITLES[panel]}>
      <header className="side-panel-head">
        <span className="side-panel-title">{TITLES[panel]}</span>
        <button type="button" className="btn-icon" aria-label="Close" onClick={closePanel}>
          ✕
        </button>
      </header>
      <div className="side-panel-body">
        {panel === 'ai' && <AiProposalsPanel />}
        {panel === 'validation' && <ValidationPanel />}
      </div>
    </aside>
  );
}
