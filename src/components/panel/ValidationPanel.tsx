import { useDesignStore } from '../../store/useDesignStore';
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

/** Rad-id + titel, t.ex. "ERG-08 / FEN-03 — Huvudgärd mot stabil vägg". */
function ruleLabel(r: RuleResult): string {
  const twin = r.rule.twin ? ` / ${r.rule.twin.id}` : '';
  return `${r.rule.id}${twin} — ${r.rule.title}`;
}

export function ValidationPanel() {
  const updatedAt = useDesignStore((s) => s.design.updatedAt);
  const select = useUiStore((s) => s.select);
  const report = useValidationStore((s) => s.report);
  const fengShui = useValidationStore((s) => s.fengShui);
  const highlight = useValidationStore((s) => s.highlight);
  const validate = useValidationStore((s) => s.validate);
  const setFengShui = useValidationStore((s) => s.setFengShui);
  const toggleHighlight = useValidationStore((s) => s.toggleHighlight);

  const stale = report !== null && report.designUpdatedAt !== updatedAt;

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
        Kontrollerar möbleringen mot regelkatalogen (säkerhet, tillgänglighet, ergonomi, feng
        shui m.m.). Klicka på ett fel för att markera det i 3D-vyn.
      </p>
      <label className="check-field">
        <input
          type="checkbox"
          checked={fengShui}
          onChange={(e) => setFengShui(e.target.checked)}
        />
        <span>Ta med feng shui-regler</span>
      </label>
      <div className="button-row">
        <button type="button" className="btn btn-accent" onClick={validate}>
          Validera möblering
        </button>
      </div>

      {stale && <p className="hint validation-stale">Rummet har ändrats — validera igen.</p>}

      {report && (
        <>
          <div className="validation-summary">
            <div className={`validation-total ${scoreClass(report.total)}`}>
              <strong>{report.total === null ? '–' : `${report.total} p`}</strong>
              <span>av 100</span>
            </div>
            <div className="validation-meta">
              <span>
                {report.roomTypes.length > 0
                  ? `Tolkat som: ${report.roomTypes.map((t) => ROOM_TYPE_LABEL[t]).join(' + ')}`
                  : 'Rumstyp okänd — möblera för att aktivera fler regler.'}
              </span>
              <span>
                {passedCount} godkända · {violated.length} brutna
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
            <p className="hint">Inga regelbrott hittades — snyggt möblerat!</p>
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
                              // Markera i 3D:n, inte i egenskapspanelen.
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
