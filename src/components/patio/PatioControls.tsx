import { useState } from 'react';
import {
  DECK_MAX_DEPTH,
  DECK_MAX_WIDTH,
  DECK_MIN_DEPTH,
  DECK_MIN_WIDTH,
  DECK_PRESETS,
  usePatioStore,
  YARD_MAX_DEPTH,
  YARD_MIN_DEPTH,
} from '../../store/usePatioStore';
import { DECK_MATERIALS, SURFACES } from './surfaces';
import { Icon } from '../ui/Icon';

/** A labelled slider — the natural control for "try a few different sizes". */
function RangeField({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="field range">
      <span className="field-label range-head">
        <span>{label}</span>
        <span className="range-value">{value.toFixed(1).replace(/\.0$/, '')} m</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

export function PatioControls() {
  const s = usePatioStore();
  const [open, setOpen] = useState(true);

  return (
    <section className={open ? 'patio-panel' : 'patio-panel patio-panel-collapsed'} aria-label="Patio options">
      <header className="patio-panel-head">
        <h2 className="patio-panel-title">Altan &amp; markyta</h2>
        <button
          type="button"
          className="btn-icon patio-panel-toggle"
          aria-label={open ? 'Collapse options' : 'Expand options'}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <Icon name={open ? 'chevron-down' : 'chevron-right'} />
        </button>
      </header>

      {open && (
        <div className="patio-panel-body">
          {/* Presets — one tap to try a whole size */}
          <div className="field">
            <span className="field-label">Snabbval</span>
            <div className="button-row patio-presets">
              {DECK_PRESETS.map((p) => {
                const active = s.deckWidth === p.deckWidth && s.deckDepth === p.deckDepth;
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={active ? 'btn btn-accent' : 'btn'}
                    onClick={() => s.applyPreset(p)}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="stack patio-ranges">
            <RangeField
              label="Altanens bredd"
              value={s.deckWidth}
              min={DECK_MIN_WIDTH}
              max={DECK_MAX_WIDTH}
              step={0.1}
              onChange={s.setDeckWidth}
            />
            <RangeField
              label="Altanens djup"
              value={s.deckDepth}
              min={DECK_MIN_DEPTH}
              max={DECK_MAX_DEPTH}
              step={0.1}
              onChange={s.setDeckDepth}
            />
            <RangeField
              label="Markyta framför"
              value={s.yardDepth}
              min={YARD_MIN_DEPTH}
              max={YARD_MAX_DEPTH}
              step={0.1}
              onChange={s.setYardDepth}
            />
          </div>

          {/* Decking material */}
          <div className="field">
            <span className="field-label">Trall</span>
            <div className="palette patio-palette">
              {DECK_MATERIALS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className="palette-btn"
                  aria-pressed={s.deckMaterial === m.id}
                  aria-label={m.aria}
                  onClick={() => s.setDeckMaterial(m.id)}
                >
                  <span className="swatch" style={{ background: m.swatch }} />
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Ground surface */}
          <div className="field">
            <span className="field-label">Markbeläggning</span>
            <div className="palette patio-palette">
              {SURFACES.map((surf) => (
                <button
                  key={surf.id}
                  type="button"
                  className="palette-btn"
                  aria-pressed={s.surface === surf.id}
                  aria-label={surf.aria}
                  onClick={() => s.setSurface(surf.id)}
                >
                  <span className="swatch" style={{ background: surf.swatch }} />
                  {surf.label}
                </button>
              ))}
            </div>
          </div>

          <label className="check-field patio-props">
            <input
              type="checkbox"
              checked={s.showProps}
              onChange={(e) => s.setShowProps(e.target.checked)}
            />
            Möblering &amp; detaljer
          </label>

          <div className="button-row patio-reset">
            <button type="button" className="btn" onClick={s.reset}>
              <Icon name="rotate-ccw" /> Återställ
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
