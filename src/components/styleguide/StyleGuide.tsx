import { useState } from 'react';
import { Icon, ICON_NAMES } from '../ui/Icon';

/**
 * Living component reference ("style guide") for RoomCraft's UI.
 *
 * It is deliberately built from the SAME `index.css` classes and the SAME
 * `Icon` component the real app uses — nothing here is a bespoke re-creation.
 * That is the whole point: a standalone HTML mock-up drifts away from the app
 * the moment a class changes, whereas this page renders the real primitives, so
 * it can only ever show what the app actually looks like. The design tokens are
 * read live from the document's computed styles for the same reason.
 *
 * Open it at `#styleguide` (e.g. http://localhost:5173/#styleguide). See
 * `docs/DESIGN.md` for the tokens and the rules that go with these components.
 */

/** CSS custom properties grouped for display; values are read live at render. */
const COLOR_TOKENS = [
  '--paper',
  '--paper-2',
  '--card',
  '--ink',
  '--muted',
  '--line',
  '--accent',
  '--accent-dark',
  '--select',
  '--danger',
  '--danger-dark',
];

const CHROME_TOKENS = ['--popup-radius', '--popup-border', '--popup-shadow'];
const TYPE_TOKENS = ['--display', '--body'];
const ICON_TOKENS = ['--icon', '--icon-sm'];

/** A representative slice of the furniture palette, mirroring the real swatches. */
const PALETTE_SAMPLE = [
  { label: 'Bed', color: '#8a6f52' },
  { label: 'Sofa', color: '#6f7f7a' },
  { label: 'Table', color: '#a3855c' },
  { label: 'Rug', color: '#b4532f' },
  { label: 'Plant', color: '#4a7a3a' },
  { label: 'Wardrobe', color: '#6b5b45' },
];

function tokenValue(name: string): string {
  if (typeof window === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** One labelled block in the gallery, with an optional usage note. */
function Demo({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="sg-demo">
      <div className="sg-demo-head">
        <h3 className="sg-demo-title">{title}</h3>
        {note && <p className="sg-demo-note">{note}</p>}
      </div>
      <div className="sg-demo-body">{children}</div>
    </section>
  );
}

function ColorSwatches() {
  return (
    <div className="sg-token-grid">
      {COLOR_TOKENS.map((name) => {
        const value = tokenValue(name);
        return (
          <div key={name} className="sg-token">
            <span className="sg-token-chip" style={{ background: `var(${name})` }} />
            <code className="sg-token-name">{name}</code>
            <code className="sg-token-value">{value}</code>
          </div>
        );
      })}
    </div>
  );
}

function TextTokens({ names }: { names: string[] }) {
  return (
    <div className="sg-token-list">
      {names.map((name) => (
        <div key={name} className="sg-token-row">
          <code className="sg-token-name">{name}</code>
          <code className="sg-token-value">{tokenValue(name) || '—'}</code>
        </div>
      ))}
    </div>
  );
}

function CountStepper() {
  const [count, setCount] = useState(2);
  return (
    <div className="count-field" role="group" aria-label="Count">
      <button
        type="button"
        className="count-step"
        onClick={() => setCount((c) => Math.max(0, c - 1))}
        disabled={count <= 0}
        aria-label="Decrease"
      >
        −
      </button>
      <span className="count-value">{count}</span>
      <button
        type="button"
        className="count-step"
        onClick={() => setCount((c) => Math.min(8, c + 1))}
        disabled={count >= 8}
        aria-label="Increase"
      >
        +
      </button>
    </div>
  );
}

export function StyleGuide() {
  const [color, setColor] = useState('#b4532f');
  const [checked, setChecked] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="sg-root">
      <header className="sg-header">
        <h1 className="sg-brand">RoomCraft</h1>
        <p className="sg-tagline">Component &amp; UX reference</p>
        <p className="sg-lede">
          The live source of truth for the app's look and behaviour. Every element below
          renders from the real <code>src/index.css</code> classes and the shared{' '}
          <code>Icon</code> component — so it always matches the app. Building or updating a
          UI surface? Reuse these primitives and follow <code>docs/DESIGN.md</code>.
        </p>
      </header>

      <div className="sg-page">
        {/* ---------- Foundations ---------- */}
        <div className="sg-section-label">Foundations</div>

        <Demo title="Colour tokens" note="Read live from :root — never hand-copy hex values into a component.">
          <ColorSwatches />
        </Demo>

        <Demo title="Typography" note="--display (Fraunces) for headings & numerals; --body (Karla) for everything else.">
          <div className="sg-type-samples">
            <p style={{ fontFamily: 'var(--display)', fontSize: 30, fontVariationSettings: "'opsz' 60, 'wght' 560" }}>
              Fraunces display heading
            </p>
            <p style={{ fontFamily: 'var(--body)', fontSize: 15 }}>
              Karla body text — the default 15px/1.45 used across the interface.
            </p>
            <p className="hint">Muted hint text (.hint) sits at 12px in --muted.</p>
          </div>
          <TextTokens names={TYPE_TOKENS} />
        </Demo>

        <Demo title="Floating-surface chrome" note="Shared radius / border / shadow so every modal, panel and menu reads as one family.">
          <TextTokens names={CHROME_TOKENS} />
          <div className="sg-chrome-preview">Popup surface using --popup-* tokens</div>
        </Demo>

        <Demo title="Icons" note="Inlined Lucide glyphs on one 24-grid stroke. Size follows font-size (1em).">
          <TextTokens names={ICON_TOKENS} />
          <div className="sg-icon-grid">
            {ICON_NAMES.map((name) => (
              <div key={name} className="sg-icon-cell">
                <Icon name={name} style={{ width: 22, height: 22 }} />
                <code>{name}</code>
              </div>
            ))}
          </div>
        </Demo>

        {/* ---------- Buttons ---------- */}
        <div className="sg-section-label">Buttons</div>

        <Demo title="Button variants" note="Default outline = neutral. .btn-accent = primary. .btn-danger = destructive confirm. .btn-done = leave/primary in ink.">
          <div className="button-row">
            <button type="button" className="btn">Default</button>
            <button type="button" className="btn btn-accent">Accent</button>
            <button type="button" className="btn btn-danger">Danger</button>
            <button type="button" className="btn btn-done">Done</button>
            <button type="button" className="btn btn-lg btn-accent">Large accent</button>
          </div>
          <div className="button-row" style={{ marginTop: 12 }}>
            <button type="button" className="btn">
              <Icon name="plus" /> With icon
            </button>
            <span className="btn-tooltip-wrap" title="This action is unavailable">
              <button type="button" className="btn" disabled>
                Disabled
              </button>
            </span>
            <button type="button" className="btn-icon" aria-label="Delete">
              <Icon name="trash-2" />
            </button>
            <button type="button" className="btn btn-zoom" aria-label="Zoom in">
              +
            </button>
          </div>
        </Demo>

        <Demo title="Source toggle" note="Segmented control (.source-toggle) for either/or choices.">
          <div className="source-toggle">
            <button type="button" className="btn" style={{ border: 0, borderRadius: 0 }}>
              Generic
            </button>
            <button type="button" className="btn btn-accent" style={{ border: 0, borderRadius: 0 }}>
              Library
            </button>
          </div>
        </Demo>

        {/* ---------- Fields ---------- */}
        <div className="sg-section-label">Fields &amp; inputs</div>

        <Demo title="Text & number fields" note="Wrap inputs in .field-input so focus rings and suffixes are consistent. Two-up with .field-grid.">
          <div className="field-grid" style={{ maxWidth: 360 }}>
            <label className="field">
              <span className="field-label">Name</span>
              <span className="field-input">
                <input type="text" defaultValue="Master bedroom" />
              </span>
            </label>
            <label className="field">
              <span className="field-label">Width</span>
              <span className="field-input">
                <input type="number" defaultValue={340} />
                <span className="field-suffix">cm</span>
              </span>
            </label>
          </div>
        </Demo>

        <Demo title="Select, checkbox, stepper & colour">
          <div className="stack" style={{ maxWidth: 360 }}>
            <select defaultValue="rug">
              <option value="rug">Rug</option>
              <option value="sofa">Sofa</option>
              <option value="table">Table</option>
            </select>
            <label className="check-field">
              <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
              Show measurements
            </label>
            <CountStepper />
            <label className="color-field">
              <input
                type="color"
                className="color-field-chip"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
              <span className="color-field-label">Colour</span>
            </label>
          </div>
        </Demo>

        {/* ---------- Surfaces & feedback ---------- */}
        <div className="sg-section-label">Surfaces &amp; feedback</div>

        <Demo title="Card & chips" note="Cards (.card) host repeated records; chips (.chip) tag their kind.">
          <div className="card" style={{ maxWidth: 320 }}>
            <div className="card-head">
              <span className="chip door">Door</span>
              <select defaultValue="north">
                <option value="north">North wall</option>
                <option value="east">East wall</option>
              </select>
              <button type="button" className="btn-icon" aria-label="Remove">
                <Icon name="x" />
              </button>
            </div>
            <span className="chip window" style={{ alignSelf: 'flex-start' }}>
              Window
            </span>
          </div>
        </Demo>

        <Demo title="Hints & errors" note="One .hint and one .error style, shared everywhere, so all guidance and failures look identical.">
          <p className="hint">Drag to orbit · scroll to zoom.</p>
          <p className="error" style={{ maxWidth: 360, marginTop: 10 }}>
            Draw an exterior outline before adding furniture.
          </p>
        </Demo>

        <Demo title="Furniture palette" note="Grid of .palette-btn, each with a colour .swatch.">
          <div className="palette" style={{ maxWidth: 320 }}>
            {PALETTE_SAMPLE.map((p) => (
              <button key={p.label} type="button" className="palette-btn">
                <span className="swatch" style={{ background: p.color }} />
                {p.label}
              </button>
            ))}
          </div>
        </Demo>

        <Demo title="Validation: score bands & severity" note="Score number is coloured by band; severity dots run 5 (worst) → 1.">
          <div className="sg-inline-row">
            <span className="score-badge score-good" style={{ position: 'static' }}>
              <span className="score-badge-value">92</span>
            </span>
            <span className="score-badge score-mid" style={{ position: 'static' }}>
              <span className="score-badge-value">68</span>
            </span>
            <span className="score-badge score-bad" style={{ position: 'static' }}>
              <span className="score-badge-value">34</span>
            </span>
          </div>
          <div className="sg-inline-row" style={{ marginTop: 14 }}>
            {[5, 4, 3, 2, 1].map((s) => (
              <span key={s} className={`severity severity-${s}`}>
                {s}
              </span>
            ))}
          </div>
        </Demo>

        <Demo title="Modal" note="Centred dialog on the shared --popup-* chrome. .modal-sm for short confirms.">
          <button type="button" className="btn btn-accent" onClick={() => setModalOpen(true)}>
            Open modal
          </button>
          {modalOpen && (
            <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
              <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
                <div className="modal-head">
                  <span className="modal-title">Delete room</span>
                  <button type="button" className="btn-icon" aria-label="Close" onClick={() => setModalOpen(false)}>
                    <Icon name="x" />
                  </button>
                </div>
                <div className="modal-body">
                  <p className="modal-message">This removes the room and its layout. This cannot be undone.</p>
                </div>
                <div className="modal-foot">
                  <button type="button" className="btn" onClick={() => setModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-danger" onClick={() => setModalOpen(false)}>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </Demo>

        <Demo title="Collapsible section" note="Sidebar grouping (<details class='section'>) with the +/− marker.">
          <details className="section" open style={{ maxWidth: 360, border: '1px solid var(--line)', borderRadius: 6 }}>
            <summary>Room</summary>
            <div className="section-body">
              <p className="hint">Section bodies hold fields and controls.</p>
            </div>
          </details>
        </Demo>
      </div>

      <footer className="sg-footer">
        Add a component? Add it here too, then note its rule in <code>docs/DESIGN.md</code>.
      </footer>
    </div>
  );
}
