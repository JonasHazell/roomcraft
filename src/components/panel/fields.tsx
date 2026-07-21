import { useState, type ReactNode } from 'react';
import { Icon } from '../ui/Icon';

/** Clamps a value into [min, max] — the bound every NumberField/CountField commits to. */
export function clampToRange(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max = 1000,
  step = 0.1,
  suffix = 'cm',
  commitOnBlur = false,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  /**
   * Apply the typed value only on blur or Enter, instead of on every keystroke
   * (the default). Use this for a field whose live value drives a *destructive*
   * recalculation elsewhere — e.g. a wall length that reclamps its doors/windows
   * to fit — so that a half-typed, transiently tiny number (typed while replacing
   * the previous value) is never treated as a real, final edit. Matches the same
   * pattern already used by `PlanLengthInput` for wall length while drawing.
   */
  commitOnBlur?: boolean;
}) {
  // Local text while the field is focused, so that half-typed numbers ("1.")
  // don't bounce back from the store's clamped value.
  const [text, setText] = useState<string | null>(null);
  const shown = text ?? String(Number(value.toFixed(2)));

  const commit = (raw: string) => {
    const n = parseFloat(raw);
    if (Number.isFinite(n)) onChange(clampToRange(n, min, max));
  };

  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="field-input">
        <input
          type="number"
          value={shown}
          min={min}
          max={max}
          step={step}
          // The visible suffix (e.g. "cm") sits right after the input but must
          // not become part of its accessible name — without this, screen
          // readers and `getByLabel('Length')`-style lookups see "Lengthcm"
          // instead of "Length". `aria-label` here wins over the wrapping
          // `<label>`'s text, so the suffix span can stay purely visual.
          aria-label={label}
          onFocus={(e) => {
            setText(shown);
            if (commitOnBlur) e.currentTarget.select();
          }}
          onChange={(e) => {
            setText(e.target.value);
            if (!commitOnBlur) commit(e.target.value);
          }}
          onKeyDown={
            commitOnBlur
              ? (e) => {
                  if (e.key === 'Enter') {
                    commit(e.currentTarget.value);
                    e.currentTarget.blur();
                  } else if (e.key === 'Escape') {
                    setText(null);
                    e.currentTarget.blur();
                  }
                }
              : undefined
          }
          onBlur={(e) => {
            if (commitOnBlur) commit(e.target.value);
            setText(null);
          }}
        />
        <span className="field-suffix" aria-hidden="true">
          {suffix}
        </span>
      </span>
    </label>
  );
}

/** A small integer stepper (−/value/+) for a bounded count, e.g. number of shelves. */
export function CountField({
  label,
  value,
  onChange,
  min = 0,
  max = 99,
  title,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  title?: string;
}) {
  return (
    <label className="field" title={title}>
      <span className="field-label">{label}</span>
      <span className="count-field">
        <button
          type="button"
          className="count-step"
          aria-label={`Decrease ${label}`}
          disabled={value <= min}
          onClick={() => onChange(clampToRange(value - 1, min, max))}
        >
          −
        </button>
        <span className="count-value" aria-live="polite">
          {value}
        </span>
        <button
          type="button"
          className="count-step"
          aria-label={`Increase ${label}`}
          disabled={value >= max}
          onClick={() => onChange(clampToRange(value + 1, min, max))}
        >
          +
        </button>
      </span>
    </label>
  );
}

/** A labelled checkbox for a boolean option, e.g. "has doors". */
export function ToggleField({
  label,
  value,
  onChange,
  title,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  title?: string;
}) {
  return (
    <label className="check-field" title={title}>
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

/** A labelled dropdown for a named choice, e.g. a rug pattern. */
export function SelectField({
  label,
  value,
  choices,
  onChange,
  title,
}: {
  label: string;
  value: string;
  choices: { value: string; label: string }[];
  onChange: (v: string) => void;
  title?: string;
}) {
  return (
    <label className="field" title={title}>
      <span className="field-label">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {choices.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ColorField({
  label,
  value,
  onChange,
  onReset,
  resetLabel,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  /**
   * When set, renders a small "clear override" control next to the chip — used
   * by a secondary furniture part that currently has its own colour override,
   * so the user can undo it and let the part resume following the primary
   * colour instead of staying detached for the life of the piece.
   */
  onReset?: () => void;
  /** Accessible name/tooltip for the reset control; required when `onReset` is set. */
  resetLabel?: string;
}) {
  // Matches the wall/floor colour swatches in the selection bar: a round colour
  // chip with the label beside it, rather than a boxed field with a hex readout.
  return (
    <label className="color-field" title={label}>
      <input
        type="color"
        className="color-field-chip"
        value={value}
        aria-label={label}
        onChange={(e) => onChange(e.target.value)}
      />
      <span className="color-field-label">{label}</span>
      {onReset && (
        <button
          type="button"
          className="btn-icon color-field-reset"
          title={resetLabel}
          aria-label={resetLabel}
          // The button sits inside the <label> so it stays next to the chip it
          // affects, but it must not also trigger the label's default click
          // forwarding (which would pop open the native colour picker).
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onReset();
          }}
        >
          <Icon name="rotate-ccw" />
        </button>
      )}
    </label>
  );
}

export function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details className="section" open={defaultOpen}>
      <summary>{title}</summary>
      <div className="section-body">{children}</div>
    </details>
  );
}
