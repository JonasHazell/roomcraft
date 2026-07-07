import { useState } from 'react';
import { useDesignStore } from '../../store/useDesignStore';
import { useUiStore } from '../../store/useUiStore';
import {
  fetchProposals,
  toFurnitureItem,
  validHexColor,
  type AiProposal,
  type ProposalsResponse,
} from '../../lib/aiProposals';

export function AiProposalsPanel() {
  const design = useDesignStore((s) => s.design);
  const addProposalFromFurniture = useDesignStore((s) => s.addProposalFromFurniture);
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
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  function apply(proposal: AiProposal) {
    // Keep the AI layout as its own switchable proposal instead of overwriting
    // the current furnishing. Malformed colours fall back to the current palette.
    addProposalFromFurniture(proposal.title, proposal.furniture.map(toFurnitureItem), {
      floorColor: validHexColor(proposal.floorColor),
      wallColor: validHexColor(proposal.wallColor),
    });
    select(null);
    setAppliedTitle(proposal.title);
  }

  return (
    <div className="stack">
      <p className="hint">
        Describe what the room will be used for and Claude will suggest 2–3 furnishing layouts
        with reasoning (including feng shui). Requires the AI server to be running (<code>npm run server</code>).
      </p>
      <label className="field">
        <span className="field-label">Needs &amp; wishes</span>
        <span className="field-input">
          <textarea
            rows={3}
            value={needs}
            placeholder="E.g. bedroom for two with a reading nook and room for a wardrobe"
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
          {loading ? 'Claude is thinking …' : 'Suggest furnishing'}
        </button>
      </div>

      {loading && (
        <p className="hint">This can take a couple of minutes. Claude Code runs the proposal in the terminal.</p>
      )}
      {error && <p className="error">{error}</p>}

      {result && result.proposals.length === 0 && !error && (
        <p className="hint">No proposals came back. Try describing your needs a bit more clearly.</p>
      )}

      {result?.proposals.map((p) => (
        <article className="ai-proposal" key={p.title}>
          <header className="ai-proposal-head">
            <h4>{p.title}</h4>
            {appliedTitle === p.title && <span className="ai-applied">In use</span>}
          </header>
          <p className="ai-concept">{p.concept}</p>
          <p className="ai-palette">
            <span className="swatch" style={{ background: validHexColor(p.wallColor) ?? '#ccc' }} />
            <span className="ai-dim">Walls</span>
            <span className="swatch" style={{ background: validHexColor(p.floorColor) ?? '#ccc' }} />
            <span className="ai-dim">Floor</span>
          </p>
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
              Save as proposal
            </button>
          </div>
        </article>
      ))}

      {result && result.warnings.length > 0 && (
        <div className="ai-warnings">
          <p className="field-label">Remaining remarks</p>
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
