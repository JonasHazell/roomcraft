import { useState, type ReactNode } from 'react';

export function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max = 1000,
  step = 0.1,
  suffix = 'cm',
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}) {
  // Local text while the field is focused, so that half-typed numbers ("1.")
  // don't bounce back from the store's clamped value.
  const [text, setText] = useState<string | null>(null);
  const shown = text ?? String(Number(value.toFixed(2)));

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
          onFocus={() => setText(shown)}
          onChange={(e) => {
            setText(e.target.value);
            const n = parseFloat(e.target.value);
            if (Number.isFinite(n)) onChange(n);
          }}
          onBlur={() => setText(null)}
        />
        <span className="field-suffix">{suffix}</span>
      </span>
    </label>
  );
}

export function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
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
