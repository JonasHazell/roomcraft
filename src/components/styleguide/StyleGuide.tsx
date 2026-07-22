import { useState } from 'react';
import { Icon, ICON_NAMES } from '../ui/Icon';
import { ColorField, NumberField } from '../panel/fields';
import { ROOM_TEMPLATES, templatePath } from '../../lib/roomTemplates';

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

/** A representative slice of the furniture palette, grouped by room type like the real picker. */
const PALETTE_SAMPLE = [
  {
    heading: 'Living room',
    items: [
      { label: 'Sofa', color: '#b06a45' },
      { label: 'TV', color: '#3a3a3d' },
    ],
  },
  {
    heading: 'Kitchen',
    items: [
      { label: 'Kitchen counter', color: '#e3ddcf' },
      { label: 'Fridge', color: '#d7dade' },
    ],
  },
  {
    heading: 'Bathroom',
    items: [
      { label: 'Toilet', color: '#f2f0ec' },
      { label: 'Bathtub', color: '#f2f0ec' },
    ],
  },
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
  const [partColor, setPartColor] = useState('#b4532f');
  const [partOverridden, setPartOverridden] = useState(true);
  const [checked, setChecked] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [ceiling, setCeiling] = useState(240);
  const [edge, setEdge] = useState(340);
  const [span, setSpan] = useState(5);

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
                <input type="number" defaultValue={340} aria-label="Width" />
                <span className="field-suffix" aria-hidden="true">
                  cm
                </span>
              </span>
            </label>
          </div>
        </Demo>

        <Demo
          title="Read-only field"
          note="For a computed value that can't be edited, keep .field + .field-label but swap .field-input for .field-static — e.g. the plan room panel's floor area, next to editable ceiling height."
        >
          <div className="field-grid" style={{ maxWidth: 360 }}>
            <label className="field">
              <span className="field-label">Ceiling height</span>
              <span className="field-input">
                <input type="number" defaultValue={240} aria-label="Ceiling height" />
                <span className="field-suffix" aria-hidden="true">
                  cm
                </span>
              </span>
            </label>
            <div className="field">
              <span className="field-label">Floor area</span>
              <span className="field-static">≈ 20 m²</span>
            </div>
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
            <ColorField label="Frame" value={color} onChange={setColor} />
          </div>
        </Demo>

        <Demo
          title="Colour with a clear-override control"
          note="A secondary furniture part (a bed's bedding vs its frame) gets a reset control once it has its own colour override, so the detachment can be undone instead of staying permanent."
        >
          <div className="stack" style={{ maxWidth: 360 }}>
            <ColorField
              label="Bedding"
              value={partColor}
              onChange={(c) => {
                setPartColor(c);
                setPartOverridden(true);
              }}
              onReset={
                partOverridden
                  ? () => {
                      setPartOverridden(false);
                      setPartColor(color);
                    }
                  : undefined
              }
              resetLabel="Match frame colour"
            />
          </div>
        </Demo>

        <Demo
          title="Range slider"
          note="For a continuous, bounded value where trying different amounts matters more than typing an exact number (e.g. the patio planner's deck size). Label + live value in .range-head; the accent fills the thumb."
        >
          <label className="field range" style={{ maxWidth: 360 }}>
            <span className="field-label range-head">
              <span>Deck width</span>
              <span className="range-value">{span.toFixed(1)} m</span>
            </span>
            <input
              type="range"
              min={2}
              max={9}
              step={0.1}
              value={span}
              aria-label="Deck width"
              onChange={(e) => setSpan(Number(e.target.value))}
            />
          </label>
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

        <Demo
          title="Prompt chips & AI progress"
          note="Tap-to-fill .prompt-chip buttons seed a text field (interactive, unlike the tag-only .chip). While an AI run is in flight, .ai-progress shows a rotating step label + live elapsed clock over an indeterminate .ai-progress-track bar."
        >
          <div className="prompt-chips" style={{ maxWidth: 360 }}>
            <button type="button" className="prompt-chip">
              Bedroom for two
            </button>
            <button type="button" className="prompt-chip">
              A reading nook
            </button>
            <button type="button" className="prompt-chip">
              Home office corner
            </button>
          </div>
          <div className="ai-progress" style={{ maxWidth: 360, marginTop: 14 }}>
            <div className="ai-progress-head">
              <span className="ai-progress-step">Placing furniture and picking colours …</span>
              <span className="ai-elapsed">0:42</span>
            </div>
            <div className="ai-progress-track" role="progressbar" aria-label="Generating suggestions" />
          </div>
        </Demo>

        <Demo
          title="Furniture palette"
          note="The catalog, grouped by room type: a .palette-groups column of .palette-group blocks, each a .palette-heading over a .palette grid of .palette-btn (colour .swatch)."
        >
          <div className="palette-groups" style={{ maxWidth: 320 }}>
            {PALETTE_SAMPLE.map((group) => (
              <div key={group.heading} className="palette-group">
                <h3 className="palette-heading">{group.heading}</h3>
                <div className="palette">
                  {group.items.map((p) => (
                    <button key={p.label} type="button" className="palette-btn">
                      <span className="swatch" style={{ background: p.color }} />
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Demo>

        <Demo title="Room templates" note="Starting outlines in the plan editor's shape chooser: a .template-grid of .template-card buttons, each with an SVG .template-preview.">
          <div className="template-grid" style={{ maxWidth: 460 }}>
            {ROOM_TEMPLATES.slice(0, 3).map((t) => (
              <button key={t.id} type="button" className="template-card">
                <span className="template-preview" aria-hidden="true">
                  <svg viewBox="0 0 40 40" width="40" height="40">
                    <path d={templatePath(t.points)} />
                  </svg>
                </span>
                <span className="template-name">{t.name}</span>
                <span className="template-meta">{t.detail}</span>
              </button>
            ))}
            <button type="button" className="template-card template-card-blank">
              <span className="template-preview" aria-hidden="true">
                <Icon name="pencil" />
              </span>
              <span className="template-name">Draw it yourself</span>
              <span className="template-meta">Start from a blank canvas</span>
            </button>
          </div>
        </Demo>

        <Demo
          title="Plan editor top bar"
          note="The floor-plan editor's top-left controls: the circular .room-back button, the editable room name (.plan-name — a card-filled pill with a muted pencil over a borderless .plan-name-input, reading as a plain title until focused), and the .plan-furnish-btn forward action. The name flexes and truncates so it never crowds the other two; below 560px .plan-furnish-btn drops to icon-only."
        >
          <div className="sg-plan-stage" style={{ alignItems: 'center' }}>
            <span className="room-back sg-static-pill" aria-hidden="true">
              <span aria-hidden="true">
                <Icon name="arrow-left" />
              </span>
            </span>
            <label className="plan-name sg-static-pill" title="Rename this room">
              <span className="plan-name-icon" aria-hidden="true">
                <Icon name="pencil" />
              </span>
              <input
                className="plan-name-input"
                type="text"
                aria-label="Room name"
                defaultValue="Living room"
                maxLength={60}
              />
            </label>
            <button type="button" className="btn btn-accent plan-furnish-btn sg-static-pill">
              <Icon name="square" />
              <span>Furnish this room</span>
            </button>
          </div>
        </Demo>

        <Demo
          title="Shared room viewer"
          note="ShareView.tsx's read-only label (#353) — a .card floated over the 3D view (.share-badge is only the positioning wrapper) so a visitor always knows this is someone else's shared room, not their own workspace."
        >
          <div className="share-badge card" style={{ position: 'static' }}>
            <Icon name="share" />
            <span>This is a shared view of a RoomCraft room — &ldquo;Living room&rdquo;.</span>
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

        <Demo
          title="Validation: category row cues"
          note="Each .validation-categories row also takes the score-good/-mid/-bad class, adding a left border + color-mix tint so severity reads at a glance, not just the small coloured number."
        >
          <ul className="validation-categories" style={{ maxWidth: 320 }}>
            <li className="score-good">
              <span>Ergonomics & dimensions</span>
              <span className="validation-score score-good">92</span>
            </li>
            <li className="score-mid">
              <span>Acoustics & air</span>
              <span className="validation-score score-mid">68</span>
            </li>
            <li className="score-bad">
              <span>Feng shui</span>
              <span className="validation-score score-bad">34</span>
            </li>
          </ul>
        </Demo>

        <Demo title="Modal" note="Centred dialog on the shared --popup-* chrome. .modal-sm for short confirms; .modal-just-placed shortens & bottom-anchors the furniture create→edit hand-off on mobile so the placed piece stays visible.">
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

        <Demo
          title="Shortcut list"
          note="Action › key rows inside a .modal-sm (ShortcutsReference, #227). .key styles a single keycap; combos join with +, alternatives with 'or'."
        >
          <ul className="shortcut-list" style={{ maxWidth: 320 }}>
            <li className="shortcut-row">
              <span className="shortcut-action">Undo</span>
              <span className="shortcut-keys">
                <span className="shortcut-combo">
                  <kbd className="key">Ctrl/⌘</kbd>
                  <span className="shortcut-plus">+</span>
                  <kbd className="key">Z</kbd>
                </span>
              </span>
            </li>
            <li className="shortcut-row">
              <span className="shortcut-action">Redo</span>
              <span className="shortcut-keys">
                <span className="shortcut-combo">
                  <kbd className="key">Ctrl/⌘</kbd>
                  <span className="shortcut-plus">+</span>
                  <kbd className="key">Shift</kbd>
                  <span className="shortcut-plus">+</span>
                  <kbd className="key">Z</kbd>
                </span>
                <span className="shortcut-combo">
                  <span className="shortcut-or">or</span>
                  <kbd className="key">Ctrl/⌘</kbd>
                  <span className="shortcut-plus">+</span>
                  <kbd className="key">Y</kbd>
                </span>
              </span>
            </li>
          </ul>
        </Demo>

        <Demo
          title="Room summary (print/export)"
          note="A printable snapshot of the room (RoomSummary.tsx, opened from the printer icon next to the room top bar's keyboard-shortcuts icon, #368): the outline plus each piece's real footprint (floorPolygon/rectCorners — the same geometry the lobby thumbnail and collision engine use) in .room-summary-plan-svg, the score reusing ValidationPanel's own .validation-summary markup, and a .room-summary-list of furniture rows. A scoped @media print block (.app-printing, set on the app root only while open) hides the rest of the app so only the sheet prints."
        >
          <div className="room-summary-sheet" style={{ maxWidth: 420 }}>
            <header className="room-summary-head">
              <h1 className="room-summary-title">Bedroom</h1>
              <p className="hint">Ceiling height 240 cm · Generated 2026-07-19</p>
            </header>
            <section className="room-summary-section">
              <h2 className="room-summary-heading">Floor plan</h2>
              <svg className="room-summary-plan-svg" viewBox="0 0 40 40" style={{ maxWidth: 200 }}>
                <path
                  className="room-summary-plan-floor"
                  d={templatePath(ROOM_TEMPLATES[1].points)}
                  style={{ fill: '#c9a878' }}
                />
                <rect className="room-summary-plan-item" x="8" y="22" width="14" height="10" style={{ fill: '#7d8c72' }} />
                <rect className="room-summary-plan-item" x="24" y="6" width="8" height="8" style={{ fill: '#4a453c' }} />
              </svg>
            </section>
            <section className="room-summary-section">
              <h2 className="room-summary-heading">Validation score</h2>
              <div className="validation-summary">
                <div className="validation-total score-good">
                  <strong>88 pts</strong>
                  <span>of 100</span>
                </div>
                <div className="validation-meta">
                  <span>Interpreted as: Bedroom</span>
                  <span>11 passed · 2 violated</span>
                </div>
              </div>
            </section>
            <section className="room-summary-section">
              <h2 className="room-summary-heading">Furniture (2)</h2>
              <ul className="room-summary-list">
                <li className="room-summary-row">
                  <span className="swatch room-summary-swatch" style={{ background: '#7d8c72' }} />
                  <span className="room-summary-row-name">Bed</span>
                  <span className="room-summary-row-kind">Bed</span>
                  <span className="room-summary-row-size">160 cm × 200 cm × 50 cm</span>
                </li>
                <li className="room-summary-row">
                  <span className="swatch room-summary-swatch" style={{ background: '#4a453c' }} />
                  <span className="room-summary-row-name">Chair</span>
                  <span className="room-summary-row-kind">Chair</span>
                  <span className="room-summary-row-size">45 cm × 45 cm × 90 cm</span>
                </li>
              </ul>
            </section>
          </div>
        </Demo>

        <Demo title="Collapsible section" note="Sidebar grouping (<details class='section'>) with the +/− marker.">
          <details className="section" open style={{ maxWidth: 360, border: '1px solid var(--line)', borderRadius: 6 }}>
            <summary>Room</summary>
            <div className="section-body">
              <p className="hint">Section bodies hold fields and controls.</p>
            </div>
          </details>
        </Demo>

        {/* ---------- Docks & floating plan chrome ---------- */}
        <div className="sg-section-label">Docks &amp; plan chrome</div>

        <Demo
          title="Dock pill bar"
          note="The floating rounded bar (.selection-bar) of .sel-action pills — the contextual selection bar in the 3D view and the tool bar in the plan editor. Pills can hold a glyph, a colour swatch (.sel-color) or a dropdown (.sel-select). In the app three of these sit in a .selection-bar-wrap grid: add left · contextual centre · undo/redo right."
        >
          <div className="selection-bar" role="toolbar" aria-label="Example dock bar" style={{ animation: 'none' }}>
            <button type="button" className="sel-action sel-active">
              <span className="sel-icon" aria-hidden="true">
                <Icon name="mouse-pointer" />
              </span>
              <span className="sel-label">Select</span>
            </button>
            <button type="button" className="sel-action">
              <span className="sel-icon" aria-hidden="true">
                <Icon name="square" />
              </span>
              <span className="sel-label">Exterior</span>
            </button>
            <span className="sel-divider" aria-hidden="true" />
            <button type="button" className="sel-action sel-danger">
              <span className="sel-icon" aria-hidden="true">
                <Icon name="trash-2" />
              </span>
              <span className="sel-label">Delete</span>
            </button>
            <label className="sel-action sel-color" title="Wall colour">
              <input
                type="color"
                className="sel-color-input"
                value={color}
                aria-label="Wall colour"
                onChange={(e) => setColor(e.target.value)}
              />
              <span className="sel-label">Wall</span>
            </label>
            <label className="sel-action sel-select" title="Wall material">
              <span className="sel-label">Material</span>
              <select className="sel-select-input" defaultValue="wood" aria-label="Wall material">
                <option value="matte">Matte paint</option>
                <option value="wood">Wood</option>
                <option value="metal">Metal</option>
              </select>
            </label>
            <span className="sel-divider" aria-hidden="true" />
            <button type="button" className="sel-action sel-history" aria-label="Undo">
              <span className="sel-icon" aria-hidden="true">
                <Icon name="undo-2" />
              </span>
            </button>
            <button type="button" className="sel-action sel-history" disabled aria-label="Redo">
              <span className="sel-icon" aria-hidden="true">
                <Icon name="redo-2" />
              </span>
            </button>
          </div>
        </Demo>

        <Demo
          title="Floating plan chrome"
          note="Surfaces the floor-plan editor floats over the canvas: guidance (.plan-hint-pill) and failure (.plan-error-pill) pills top-centre, the .plan-length-input for typing an exact edge length, the .plan-room-panel chip and the .plan-wall-panel card. Shown static here; in the app each positions itself over the viewport."
        >
          <div className="sg-plan-stage">
            <p className="plan-hint-pill sg-static-pill">
              Press, drag out the wall, release to place a corner · Esc cancels
            </p>
            <p className="plan-error-pill sg-static-pill">
              Draw an exterior outline before adding an interior wall.
            </p>
            <div className="plan-length-input sg-static-pill">
              <span className="plan-length-label">Length</span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                value={edge}
                aria-label="Edge length in centimetres"
                onChange={(e) => setEdge(Number(e.target.value))}
              />
              <span className="plan-length-suffix">cm</span>
            </div>
            <div className="plan-room-panel sg-static-pill">
              <div className="field-grid">
                <NumberField
                  label="Ceiling height"
                  value={ceiling}
                  min={200}
                  max={600}
                  step={1}
                  suffix="cm"
                  onChange={setCeiling}
                />
              </div>
            </div>
            <div className="plan-wall-panel sg-static-pill">
              <p className="hint">
                <strong>North wall</strong> · 340 cm
              </p>
              <div className="field-grid">
                <NumberField label="Length" value={340} min={10} max={3000} step={1} onChange={() => {}} />
                <NumberField label="From left" value={120} min={0} max={3000} step={1} onChange={() => {}} />
              </div>
            </div>
          </div>
        </Demo>
      </div>

      <footer className="sg-footer">
        Add a component? Add it here too, then note its rule in <code>docs/DESIGN.md</code>.
      </footer>
    </div>
  );
}
