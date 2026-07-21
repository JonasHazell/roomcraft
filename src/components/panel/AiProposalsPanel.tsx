import { useEffect, useState } from 'react';
import { useDesignStore } from '../../store/useDesignStore';
import { useUiStore } from '../../store/useUiStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useAiStore } from '../../store/useAiStore';
import { toFurnitureItem, validHexColor, type AiProposal } from '../../lib/aiProposals';

// Tap-to-fill starting points, so getting a first result costs a tap instead of
// composing a sentence on a phone keyboard. Each appends a phrase to the needs
// field rather than replacing it, so they stack into a fuller brief.
const EXAMPLES = [
  'Bedroom for two',
  'A reading nook',
  'Home office corner',
  'Room for a wardrobe',
  'Calm and cosy',
];

// Rough narration of the two-pass generate-then-repair run. The server doesn't
// stream step-by-step, so these are paced by elapsed time — honest about the
// phases without pretending to a precise percentage.
const STEPS: { after: number; label: string }[] = [
  { after: 0, label: 'Reading your room and needs …' },
  { after: 10, label: 'Placing furniture and picking colours …' },
  { after: 30, label: 'Checking clearances and walkways …' },
  { after: 55, label: 'Finishing the three layouts …' },
  { after: 90, label: 'Refining the layouts …' },
  { after: 150, label: 'Still working — complex rooms take longer …' },
];

function stepFor(elapsed: number): string {
  let label = STEPS[0].label;
  for (const s of STEPS) if (elapsed >= s.after) label = s.label;
  return label;
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Ticks once a second while a run is in flight so the elapsed readout updates. */
function useElapsedSeconds(startedAt: number | null): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (startedAt == null) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  return startedAt == null ? 0 : Math.max(0, Math.floor((now - startedAt) / 1000));
}

export function AiProposalsPanel() {
  const design = useDesignStore((s) => s.design);
  const addProposalFromFurniture = useDesignStore((s) => s.addProposalFromFurniture);
  const select = useUiStore((s) => s.select);
  const closePanel = useUiStore((s) => s.closePanel);
  const openAuthDialog = useUiStore((s) => s.openAuthDialog);
  const authEnabled = useAuthStore((s) => s.enabled);
  const user = useAuthStore((s) => s.user);
  const signedIn = user !== null;
  const aiGenerationCap = useAuthStore((s) => s.aiGenerationCap);

  const needs = useAiStore((s) => s.needs);
  const setNeeds = useAiStore((s) => s.setNeeds);
  const loading = useAiStore((s) => s.loading);
  const startedAt = useAiStore((s) => s.startedAt);
  const error = useAiStore((s) => s.error);
  const result = useAiStore((s) => s.result);
  const appliedTitle = useAiStore((s) => s.appliedTitle);
  const interrupted = useAiStore((s) => s.interrupted);
  const generate = useAiStore((s) => s.generate);
  const cancel = useAiStore((s) => s.cancel);
  const markHidden = useAiStore((s) => s.markHidden);
  const setApplied = useAiStore((s) => s.setApplied);

  const elapsed = useElapsedSeconds(startedAt);

  // Mobile browsers throttle/suspend background tabs, which can silently kill an
  // in-flight request. Note when the tab goes hidden mid-run so a later failure
  // can be explained rather than looking random.
  useEffect(() => {
    if (!loading) return;
    const onVisibility = () => {
      if (document.hidden) markHidden();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [loading, markHidden]);

  function addExample(phrase: string) {
    const current = needs.trim();
    if (current.length === 0) {
      setNeeds(phrase);
    } else if (!current.toLowerCase().includes(phrase.toLowerCase())) {
      setNeeds(`${current}, ${phrase.charAt(0).toLowerCase()}${phrase.slice(1)}`);
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
    setApplied(proposal.title);
  }

  // When the server has sign-in configured, AI furnishing is for signed-in users
  // only (each call runs on the owner's Claude login). Prompt to sign in instead
  // of showing the form.
  if (authEnabled && !signedIn) {
    return (
      <div className="stack">
        <p className="hint">Sign in to describe your needs and get AI furnishing suggestions.</p>
        <div className="button-row">
          <button type="button" className="btn btn-accent" onClick={openAuthDialog}>
            Sign in
          </button>
        </div>
      </div>
    );
  }

  const canGenerate = needs.trim().length > 0;
  // Remaining-generations context (#352), shown before the wall is ever hit —
  // only meaningful for a signed-in free-plan account; a 'pro' account or a
  // server with no cap configured (dev, no database) has nothing to count down.
  const remaining =
    user && user.plan === 'free' && aiGenerationCap != null
      ? Math.max(0, aiGenerationCap - user.aiGenerationsUsed)
      : null;

  return (
    <div className="stack">
      <p className="hint">
        Describe what the room will be used for and Claude will suggest 3 furnishing layouts
        with reasoning (including feng shui). Each suggestion is saved as its own proposal.
      </p>
      {remaining !== null && (
        <p className="hint">
          {remaining} of {aiGenerationCap} free generations left.
        </p>
      )}
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

      <div className="prompt-chips" aria-label="Example needs to add">
        {EXAMPLES.map((phrase) => (
          <button
            key={phrase}
            type="button"
            className="prompt-chip"
            disabled={loading}
            onClick={() => addExample(phrase)}
          >
            {phrase}
          </button>
        ))}
      </div>

      <div className="button-row">
        {loading ? (
          <>
            <button type="button" className="btn btn-accent" disabled>
              Claude is thinking …
            </button>
            <button type="button" className="btn" onClick={cancel}>
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            className="btn btn-accent"
            disabled={!canGenerate}
            onClick={() => generate(design)}
          >
            {result ? 'Suggest again' : 'Suggest furnishing'}
          </button>
        )}
      </div>

      {/* Status region — announced to screen readers as it changes. */}
      <div aria-live="polite">
        {loading && (
          <div className="ai-progress">
            <div className="ai-progress-head">
              <span className="ai-progress-step">{stepFor(elapsed)}</span>
              <span className="ai-elapsed" aria-hidden="true">
                {formatElapsed(elapsed)}
              </span>
            </div>
            <div className="ai-progress-track" role="progressbar" aria-label="Generating suggestions" />
            <p className="hint">
              This usually takes under a minute. Keep RoomCraft open — switching apps can
              interrupt the suggestions.
            </p>
          </div>
        )}

        {result && result.proposals.length === 0 && !error && (
          <p className="hint">No proposals came back. Try describing your needs a bit more clearly.</p>
        )}
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
          {interrupted && ' The tab was in the background while Claude was working, which can interrupt it — try again with RoomCraft in the foreground.'}
        </p>
      )}

      {result?.proposals.map((p) => {
        const inUse = appliedTitle === p.title;
        return (
          <article className="ai-proposal" key={p.title}>
            <header className="ai-proposal-head">
              <h4>{p.title}</h4>
              {inUse && <span className="ai-applied">In use</span>}
            </header>
            <p className="ai-concept">{p.concept}</p>
            <p className="ai-palette">
              <span className="swatch" style={{ background: validHexColor(p.wallColor) ?? 'var(--line)' }} />
              <span className="ai-dim">Walls</span>
              <span className="swatch" style={{ background: validHexColor(p.floorColor) ?? 'var(--line)' }} />
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
              {inUse ? (
                <button type="button" className="btn" onClick={closePanel}>
                  View in room
                </button>
              ) : (
                <button type="button" className="btn btn-accent" onClick={() => apply(p)}>
                  Save as proposal
                </button>
              )}
            </div>
          </article>
        );
      })}

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

      {result && result.proposals.length > 0 && !loading && (
        <div className="button-row">
          <button
            type="button"
            className="btn"
            disabled={!canGenerate}
            onClick={() => generate(design)}
          >
            More suggestions
          </button>
        </div>
      )}
    </div>
  );
}
