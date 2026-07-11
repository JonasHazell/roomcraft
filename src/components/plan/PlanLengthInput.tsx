import { useState } from 'react';

interface Props {
  /** The current (aimed or selected) edge length in cm, shown while not editing. */
  lengthCm: number;
  /** Apply exactly this many cm — place the next corner, or resize a picked edge. */
  onCommit: (cm: number) => void;
  /** Label before the field ("Length" while aiming, "Edge" for a picked edge). */
  label?: string;
  /** Focus and select the field on mount — used when an edge is picked to edit. */
  autoFocus?: boolean;
  /**
   * Apply the typed value when the field loses focus, not only on Enter. Used when
   * editing a picked edge — tapping away (common on touch, where there is no Enter
   * key) then applies the length instead of silently discarding it. Left off while
   * aiming, where blur must not place a corner (e.g. when clicking the canvas).
   */
  commitOnBlur?: boolean;
}

/**
 * A small box for setting the exact length of a wall while drawing: either the
 * edge being aimed (point the wall, type a length, Enter drops the corner at that
 * distance) or an already-placed edge picked for editing — no need to close the
 * room first to fine-tune it.
 */
export function PlanLengthInput({
  lengthCm,
  onCommit,
  label = 'Length',
  autoFocus,
  commitOnBlur,
}: Props) {
  // Local text while the field is focused, so the live length doesn't overwrite
  // what is being typed; null means "not editing, follow the live value".
  const [text, setText] = useState<string | null>(null);
  const shown = text ?? String(lengthCm);

  const commit = () => {
    const n = parseInt(shown, 10);
    if (Number.isFinite(n) && n > 0) onCommit(n);
    setText(null);
  };

  return (
    <div className="plan-length-input">
      <span className="plan-length-label">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        step={1}
        value={shown}
        aria-label="Edge length in centimetres"
        autoFocus={autoFocus}
        onFocus={(e) => {
          setText(shown);
          e.currentTarget.select();
        }}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          // The editor listens on window for Enter (finish) and Esc (cancel);
          // keep those from firing while the length is being typed.
          e.stopPropagation();
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
            e.currentTarget.blur();
          } else if (e.key === 'Escape') {
            setText(null);
            e.currentTarget.blur();
          }
        }}
        onBlur={() => (commitOnBlur ? commit() : setText(null))}
      />
      <span className="plan-length-suffix">cm</span>
    </div>
  );
}
