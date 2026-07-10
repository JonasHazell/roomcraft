import { useEffect } from 'react';
import { useUiStore } from '../../store/useUiStore';
import { useValidationStore } from '../../store/useValidationStore';

function scoreClass(score: number | null): string {
  if (score === null) return '';
  if (score >= 80) return 'score-good';
  if (score >= 50) return 'score-mid';
  return 'score-bad';
}

/**
 * Always-visible score chip pinned to the top-right of the 3D view. The room is
 * validated automatically on every change, so this stays current; clicking it
 * opens (or closes) the validation panel with the full list of issues.
 */
export function ValidationScore() {
  const appView = useUiStore((s) => s.appView);
  const panel = useUiStore((s) => s.panel);
  const openPanel = useUiStore((s) => s.openPanel);
  const closePanel = useUiStore((s) => s.closePanel);
  const report = useValidationStore((s) => s.report);
  const validate = useValidationStore((s) => s.validate);

  // Ensure a report exists as soon as the 3D view opens (e.g. after switching
  // rooms); subsequent edits refresh it via the design-store subscription.
  useEffect(() => {
    if (appView === 'furnish' && !report) validate();
  }, [appView, report, validate]);

  if (appView !== 'furnish') return null;

  const total = report?.total ?? null;
  const violated = report
    ? report.results.filter((r) => r.outcome.status === 'violated').length
    : 0;
  const active = panel === 'validation';

  return (
    <button
      type="button"
      className={`score-badge ${scoreClass(total)} ${active ? 'active' : ''}`}
      aria-expanded={active}
      aria-label={
        total === null
          ? 'Validation score unavailable — open validation'
          : `Validation score ${total} of 100, ${violated} issues — open validation`
      }
      title="Show validation issues"
      onClick={() => (active ? closePanel() : openPanel('validation'))}
    >
      <span className="score-badge-value">{total === null ? '–' : total}</span>
      <span className="score-badge-meta">
        <span className="score-badge-of">/ 100</span>
        {violated > 0 && (
          <span className="score-badge-issues">
            {violated} {violated === 1 ? 'issue' : 'issues'}
          </span>
        )}
      </span>
    </button>
  );
}
