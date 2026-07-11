import { useState } from 'react';

interface Props {
  /** The current (aimed) edge length in cm, shown live while not being edited. */
  lengthCm: number;
  /** Drop the corner at exactly this many cm along the current drawing direction. */
  onCommit: (cm: number) => void;
}

/**
 * A small box for setting the exact length of the edge being drawn: point the
 * wall in a direction, type a length in cm and press Enter to place the corner
 * at precisely that distance — no need to close the room first to fine-tune it.
 */
export function PlanLengthInput({ lengthCm, onCommit }: Props) {
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
      <span className="plan-length-label">Length</span>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        step={1}
        value={shown}
        aria-label="Edge length in centimetres"
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
        onBlur={() => setText(null)}
      />
      <span className="plan-length-suffix">cm</span>
    </div>
  );
}
