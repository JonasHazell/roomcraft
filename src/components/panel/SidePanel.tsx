import { useEffect } from 'react';
import { useUiStore } from '../../store/useUiStore';
import { AiProposalsPanel } from './AiProposalsPanel';
import { ValidationPanel } from './ValidationPanel';
import { OpeningsEditor } from './OpeningsEditor';

const TITLES = {
  ai: 'AI furnishing',
  validation: 'Validation',
  openings: 'Doors & windows',
} as const;

/**
 * The floating panel anchored to the right of the 3D viewport. Unlike a centred
 * modal it leaves the scene visible, so validation highlights and opening edits
 * can be seen while the panel is open. Hosts whichever global panel is active.
 */
export function SidePanel() {
  const appView = useUiStore((s) => s.appView);
  const panel = useUiStore((s) => s.panel);
  const closePanel = useUiStore((s) => s.closePanel);
  const selection = useUiStore((s) => s.selection);

  // The openings editor works on the selected wall — close it once the wall is
  // deselected so a stale "select a wall" panel doesn't linger.
  useEffect(() => {
    if (panel === 'openings' && selection?.kind !== 'wall') closePanel();
  }, [panel, selection, closePanel]);

  // Esc closes the panel. The furniture dialog owns Esc while it's open, and the
  // App-level handler bails out on dialogs too, so only one thing reacts.
  useEffect(() => {
    if (!panel) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !useUiStore.getState().furnitureDialog) closePanel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panel, closePanel]);

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
        {panel === 'openings' && <OpeningsEditor />}
      </div>
    </aside>
  );
}
