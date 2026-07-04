import type { PlanTool } from './PlanEditor';

interface Props {
  tool: PlanTool;
  error: string | null;
  canDelete: boolean;
  /** Förklaring till varför borttagning är avstängd; visas som tooltip. */
  deleteDisabledReason?: string;
  /** Sant när användaren zoomat/panorerat bort från den auto-anpassade vyn. */
  canResetView: boolean;
  onSelectTool: () => void;
  onExteriorTool: () => void;
  onInteriorTool: () => void;
  onDelete: () => void;
  onResetView: () => void;
}

const HINTS: Record<PlanTool, string> = {
  select:
    'Klicka på en vägg för att markera · dra vinkelrätt för att flytta · scrolla zoomar, dra på tom yta panorerar',
  exterior:
    'Klicka för att placera hörn · klicka på startpunkten för att stänga · scrolla zoomar, mittenknappen panorerar · Esc avbryter',
  interior:
    'Klicka för att placera väggpunkter · Enter eller dubbelklick avslutar · scrolla zoomar, mittenknappen panorerar · Esc avbryter',
};

export function PlanToolbar({
  tool,
  error,
  canDelete,
  deleteDisabledReason,
  canResetView,
  onSelectTool,
  onExteriorTool,
  onInteriorTool,
  onDelete,
  onResetView,
}: Props) {
  return (
    <div className="plan-toolbar">
      <div className="button-row">
        <button
          type="button"
          className={`btn ${tool === 'select' ? 'btn-accent' : ''}`}
          onClick={onSelectTool}
        >
          Markera
        </button>
        <button
          type="button"
          className={`btn ${tool === 'exterior' ? 'btn-accent' : ''}`}
          onClick={onExteriorTool}
        >
          Rita om ytterväggar…
        </button>
        <button
          type="button"
          className={`btn ${tool === 'interior' ? 'btn-accent' : ''}`}
          onClick={onInteriorTool}
        >
          Rita innervägg
        </button>
        {/* Wrapper bär tooltipen: disabled-knappar tar inte emot hover-events själva. */}
        <span
          className="btn-tooltip-wrap"
          title={canDelete ? 'Ta bort den markerade innerväggen' : deleteDisabledReason}
        >
          <button type="button" className="btn" disabled={!canDelete} onClick={onDelete}>
            Ta bort vägg
          </button>
        </span>
        <span
          className="btn-tooltip-wrap"
          title={
            canResetView
              ? 'Återställ zoom och panorering så att hela ritningen syns.'
              : 'Vyn följer redan ritningen — scrolla eller dra för att zooma och panorera.'
          }
        >
          <button type="button" className="btn" disabled={!canResetView} onClick={onResetView}>
            Anpassa vy
          </button>
        </span>
      </div>
      <p className="plan-hint">{HINTS[tool]}</p>
      {error && <p className="plan-error">{error}</p>}
    </div>
  );
}
