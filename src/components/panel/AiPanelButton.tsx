import { useUiStore } from '../../store/useUiStore';
import { Icon } from '../ui/Icon';

/**
 * Always-visible trigger for the AI furnishing panel — the entry point to the
 * app's core promise (describe the room, get a proposed layout). Pinned
 * top-right of the 3D view alongside `ValidationScore`, in the same
 * `.view-badges` row, so the two global-panel triggers read as one family.
 */
export function AiPanelButton() {
  const appView = useUiStore((s) => s.appView);
  const panel = useUiStore((s) => s.panel);
  const openPanel = useUiStore((s) => s.openPanel);
  const closePanel = useUiStore((s) => s.closePanel);

  if (appView !== 'furnish') return null;

  const active = panel === 'ai';

  return (
    <button
      type="button"
      className={`score-badge ${active ? 'active' : ''}`}
      aria-expanded={active}
      aria-label={active ? 'Close AI furnishing' : 'Open AI furnishing — describe the room, get a layout'}
      title="AI furnishing"
      onClick={() => (active ? closePanel() : openPanel('ai'))}
    >
      <Icon name="sparkles" />
      <span className="score-badge-value">AI</span>
    </button>
  );
}
