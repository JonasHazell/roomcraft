import { useState } from 'react';
import { useDesignStore } from '../../store/useDesignStore';
import { useUiStore } from '../../store/useUiStore';
import {
  fetchProposals,
  toFurnitureItem,
  type AiProposal,
  type ProposalsResponse,
} from '../../lib/aiProposals';

export function AiProposalsPanel() {
  const design = useDesignStore((s) => s.design);
  const setFurniture = useDesignStore((s) => s.setFurniture);
  const select = useUiStore((s) => s.select);

  const [needs, setNeeds] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProposalsResponse | null>(null);
  const [appliedTitle, setAppliedTitle] = useState<string | null>(null);

  async function generate() {
    if (loading || needs.trim().length === 0) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setAppliedTitle(null);
    try {
      setResult(await fetchProposals(design, needs));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Något gick fel.');
    } finally {
      setLoading(false);
    }
  }

  function apply(proposal: AiProposal) {
    setFurniture(proposal.furniture.map(toFurnitureItem));
    select(null);
    setAppliedTitle(proposal.title);
  }

  return (
    <div className="stack">
      <p className="hint">
        Beskriv vad rummet ska användas till, så föreslår Claude 2–3 möbleringar med motivering
        (bl.a. feng shui). Kräver att AI-servern körs (<code>npm run server</code>).
      </p>
      <label className="field">
        <span className="field-label">Behov &amp; önskemål</span>
        <span className="field-input">
          <textarea
            rows={3}
            value={needs}
            placeholder="T.ex. sovrum för två med läshörna och plats för garderob"
            onChange={(e) => setNeeds(e.target.value)}
          />
        </span>
      </label>
      <div className="button-row">
        <button
          type="button"
          className="btn btn-accent"
          disabled={loading || needs.trim().length === 0}
          onClick={generate}
        >
          {loading ? 'Claude tänker …' : 'Föreslå möblering'}
        </button>
      </div>

      {loading && (
        <p className="hint">Detta kan ta ett par minuter. Claude Code kör förslaget i terminalen.</p>
      )}
      {error && <p className="ai-error">{error}</p>}

      {result && result.proposals.length === 0 && !error && (
        <p className="hint">Inga förslag kom tillbaka. Prova att beskriva behovet lite tydligare.</p>
      )}

      {result?.proposals.map((p) => (
        <article className="ai-proposal" key={p.title}>
          <header className="ai-proposal-head">
            <h4>{p.title}</h4>
            {appliedTitle === p.title && <span className="ai-applied">Används</span>}
          </header>
          <p className="ai-concept">{p.concept}</p>
          <ul className="ai-furniture">
            {p.furniture.map((f, i) => (
              <li key={i}>
                <span className="swatch" style={{ background: f.color }} />
                <span>
                  <strong>{f.name}</strong>{' '}
                  <span className="ai-dim">
                    {Math.round(f.size.width * 100)}×{Math.round(f.size.depth * 100)} cm
                  </span>
                  <span className="ai-reason">{f.reasoning}</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="button-row">
            <button type="button" className="btn" onClick={() => apply(p)}>
              Använd denna möblering
            </button>
          </div>
        </article>
      ))}

      {result && result.warnings.length > 0 && (
        <div className="ai-warnings">
          <p className="field-label">Kvarstående anmärkningar</p>
          <ul>
            {result.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
