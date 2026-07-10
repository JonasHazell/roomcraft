import type { ReactNode } from 'react';
import { HistoryButtons } from './HistoryButtons';

/**
 * Shared building blocks for the bottom action pills (Action/Selection/Wall/Floor
 * bars) so their markup is defined once. A bar is a `SelBar` wrapper containing
 * `SelBarButton`s, `SelBarColor` swatches and `SelBarDivider`s.
 *
 * The bars are stacked inside a single bottom dock (see {@link BottomDock}): the
 * static room-action bar (add furniture / undo-redo) stays pinned at the bottom
 * and the contextual bar for the current selection floats just above it. Undo/redo
 * lives only on the static bar, so contextual bars pass `history={false}`.
 */
export function SelBar({
  label,
  children,
  keepLabels,
  history = true,
}: {
  label: string;
  children: ReactNode;
  /** Keep the button text labels visible on narrow phones (for short bars where
   *  they still fit); long bars drop to icon-only to save room. */
  keepLabels?: boolean;
  /** Append the shared undo/redo segment (default true). */
  history?: boolean;
}) {
  return (
    <div
      className={`selection-bar${keepLabels ? ' selection-bar-keep-labels' : ''}`}
      role="toolbar"
      aria-label={label}
    >
      {children}
      {history && <HistoryButtons />}
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
  expandable,
}: {
  icon: ReactNode;
  label?: string;
  title: string;
  ariaLabel: string;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
  /** When set, the button also exposes aria-expanded reflecting `active`. */
  expandable?: boolean;
}) {
  return (
    <button
      type="button"
      className={`sel-action${active ? ' sel-active' : ''}${danger ? ' sel-danger' : ''}`}
      title={title}
      aria-label={ariaLabel}
      aria-expanded={expandable ? Boolean(active) : undefined}
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
