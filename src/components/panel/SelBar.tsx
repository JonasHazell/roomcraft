import type { ReactNode } from 'react';

/**
 * Shared building blocks for the bottom action pills (Action/Selection/Wall/Floor
 * bars) so their markup is defined once. A bar is a `SelBar` wrapper containing
 * `SelBarButton`s, `SelBarColor` swatches and `SelBarDivider`s.
 *
 * The pills sit side by side in a single bottom dock (see the wrap in App): the
 * add-furniture pill on the left, the contextual bar for the current selection in
 * the middle, and the standalone undo/redo pill ({@link HistoryBar}) on the right.
 */
export function SelBar({
  label,
  children,
  keepLabels,
}: {
  label: string;
  children: ReactNode;
  /** Keep the button text labels visible on narrow phones (for short bars where
   *  they still fit); long bars drop to icon-only to save room. */
  keepLabels?: boolean;
}) {
  return (
    <div
      className={`selection-bar${keepLabels ? ' selection-bar-keep-labels' : ''}`}
      role="toolbar"
      aria-label={label}
    >
      {children}
    </div>
  );
}

export function SelBarDivider() {
  return <span className="sel-divider" aria-hidden="true" />;
}

export function SelBarButton({
  icon,
  label,
  title,
  ariaLabel,
  onClick,
  active,
  danger,
  disabled,
  history,
  expandable,
}: {
  icon: ReactNode;
  label?: string;
  title: string;
  ariaLabel: string;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
  /** Disables the button (e.g. nothing to undo/redo, view already fitted). */
  disabled?: boolean;
  /** Icon-only sizing used by the undo/redo history pill, regardless of the
   *  bar's label mode — see the `.sel-action.sel-history` rule in index.css. */
  history?: boolean;
  /** When set, the button also exposes aria-expanded reflecting `active`. */
  expandable?: boolean;
}) {
  return (
    <button
      type="button"
      className={`sel-action${active ? ' sel-active' : ''}${danger ? ' sel-danger' : ''}${history ? ' sel-history' : ''}`}
      title={title}
      aria-label={ariaLabel}
      aria-expanded={expandable ? Boolean(active) : undefined}
      disabled={disabled}
      onClick={onClick}
    >
      <span className="sel-icon" aria-hidden="true">
        {icon}
      </span>
      {label && <span className="sel-label">{label}</span>}
    </button>
  );
}

export function SelBarColor({
  label,
  title,
  value,
  ariaLabel,
  onChange,
}: {
  label: string;
  title: string;
  value: string;
  ariaLabel: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="sel-action sel-color" title={title}>
      <input
        type="color"
        className="sel-color-input"
        value={value}
        aria-label={ariaLabel}
        onChange={(e) => onChange(e.target.value)}
      />
      <span className="sel-label">{label}</span>
    </label>
  );
}

/** A dock pill wrapping a native `<select>` — a compact dropdown that sits in a
 *  selection bar (e.g. the floor/wall material picker). */
export function SelBarSelect({
  label,
  title,
  value,
  ariaLabel,
  choices,
  onChange,
}: {
  label: string;
  title: string;
  value: string;
  ariaLabel: string;
  choices: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="sel-action sel-select" title={title}>
      <span className="sel-label">{label}</span>
      <select
        className="sel-select-input"
        value={value}
        aria-label={ariaLabel}
        onChange={(e) => onChange(e.target.value)}
      >
        {choices.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>
    </label>
  );
}
