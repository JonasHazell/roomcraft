import { useUiStore } from '../../store/useUiStore';
import { useValidationStore } from '../../store/useValidationStore';
import { ROOM_TYPE_LABEL } from '../../lib/validation/rules';
import type { RuleResult } from '../../lib/validation/engine';

function scoreClass(score: number | null): string {
  if (score === null) return '';
  if (score >= 80) return 'score-good';
  if (score >= 50) return 'score-mid';
  return 'score-bad';
}

/** Rule id + title, e.g. "ERG-08 / FEN-03 — Headboard against a solid wall". */
function ruleLabel(r: RuleResult): string {
  const twin = r.rule.twin ? ` / ${r.rule.twin.id}` : '';
  return `${r.rule.id}${twin} — ${r.rule.title}`;
}

export function ValidationPanel() {
  const select = useUiStore((s) => s.select);
  const report = useValidationStore((s) => s.report);
  const fengShui = useValidationStore((s) => s.fengShui);
  const highlight = useValidationStore((s) => s.highlight);
  const setFengShui = useValidationStore((s) => s.setFengShui);
  const toggleHighlight = useValidationStore((s) => s.toggleHighlight);

  const violated = report
    ? report.results
        .filter((r) => r.outcome.status === 'violated')
        .sort((a, b) => b.rule.importance - a.rule.importance)
    : [];
  const passedCount = report
    ? report.results.filter((r) => r.outcome.status === 'passed').length
    : 0;

  return (
    <div className="stack">
      <p className="hint">
        The furnishing is checked automatically against the rule catalog (safety, accessibility,
        ergonomics, feng shui, etc.). Click an issue to highlight it in the 3D view.
      </p>
      <label className="check-field">
        <input
          type="checkbox"
          checked={fengShui}
          onChange={(e) => setFengShui(e.target.checked)}
        />
        <span>Include feng shui rules</span>
      </label>

      {report && (
        <>
          <div className="validation-summary">
            <div className={`validation-total ${scoreClass(report.total)}`}>
              <strong>{report.total === null ? '–' : `${report.total} pts`}</strong>
              <span>of 100</span>
            </div>
            <div className="validation-meta">
              <span>
                {report.roomTypes.length > 0
                  ? `Interpreted as: ${report.roomTypes.map((t) => ROOM_TYPE_LABEL[t]).join(' + ')}`
                  : 'Room type unknown — add furniture to activate more rules.'}
              </span>
              <span>
                {passedCount} passed · {violated.length} violated
              </span>
            </div>
          </div>

          <ul className="validation-categories">
            {report.byCategory
              .filter((c) => c.applicable > 0)
              .map((c) => (
                <li key={c.category}>
                  <span>{c.category}</span>
                  <span className={`validation-score ${scoreClass(c.score)}`}>
                    {c.score === null ? '–' : `${c.score}`}
                  </span>
                </li>
              ))}
          </ul>

          {violated.length === 0 ? (
            <p className="hint">No rule violations found — nicely furnished!</p>
          ) : (
            <ul className="validation-list">
              {violated.map((r) =>
                r.outcome.status === 'violated'
                  ? r.outcome.violations.map((v, i) => {
                      const key = `${r.rule.id}:${i}`;
                      const active = highlight?.key === key;
                      return (
                        <li key={key}>
                          <button
                            type="button"
                            className={`validation-item importance-${r.rule.importance} ${active ? 'active' : ''}`}
                            onClick={() => {
                              toggleHighlight({
                                key,
                                furnitureIds: v.furnitureIds,
                                zones: v.zones ?? [],
                              });
                              // Highlight in the 3D view, not in the properties panel.
                              select(null);
                            }}
                          >
                            <span className="validation-item-head">
                              <span className={`severity severity-${r.rule.importance}`}>
                                {r.rule.importance}
                              </span>
                              <span className="validation-rule">{ruleLabel(r)}</span>
                            </span>
                            <span className="validation-message">{v.message}</span>
                          </button>
                        </li>
                      );
                    })
                  : null,
              )}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
