import { useEffect } from 'react';
import { useDesignStore } from '../../store/useDesignStore';
import { useUiStore } from '../../store/useUiStore';
import { useValidationStore } from '../../store/useValidationStore';
import { useEscape } from '../../lib/useEscape';
import { floorPolygon, formatCm, polygonBounds, rectCorners } from '../../lib/polygon';
import { FURNITURE_CATALOG } from '../../lib/furnitureCatalog';
import { ROOM_TYPE_LABEL } from '../../lib/validation/rules';
import { Icon } from '../ui/Icon';
import type { FurnitureItem, Point, Wall } from '../../types';

function scoreClass(score: number | null): string {
  if (score === null) return '';
  if (score >= 80) return 'score-good';
  if (score >= 50) return 'score-mid';
  return 'score-bad';
}

const PLAN_SIZE = 320;
const PLAN_PAD = 18;

function pointsAttr(points: Point[]): string {
  return points.map((p) => `${p.x.toFixed(1)},${p.z.toFixed(1)}`).join(' ');
}

/**
 * The summary's own top-down 2D plan: the exterior outline via `floorPolygon`
 * (the same building block behind the lobby's room-card thumbnail,
 * `Lobby.tsx`) plus every furniture piece's real footprint via `rectCorners`
 * (the same rectangle math the 3D scene and collision engine use), tinted with
 * its actual colour. Purely presentational and self-contained — not the live,
 * editable `PlanEditor`.
 */
function SummaryPlan({
  walls,
  furniture,
  floorColor,
}: {
  walls: Wall[];
  furniture: FurnitureItem[];
  floorColor: string;
}) {
  const outline = floorPolygon(walls);
  if (outline.length < 3) return <p className="hint">No floor plan drawn yet.</p>;

  const bounds = polygonBounds(outline);
  const w = bounds.maxX - bounds.minX || 1;
  const h = bounds.maxZ - bounds.minZ || 1;
  const scale = Math.min((PLAN_SIZE - PLAN_PAD * 2) / w, (PLAN_SIZE - PLAN_PAD * 2) / h);
  const project = (p: Point): Point => ({
    x: PLAN_PAD + (p.x - bounds.minX) * scale,
    z: PLAN_PAD + (p.z - bounds.minZ) * scale,
  });

  return (
    <svg
      className="room-summary-plan-svg"
      viewBox={`0 0 ${PLAN_SIZE} ${PLAN_SIZE}`}
      role="img"
      aria-label="Top-down floor plan"
    >
      <polygon
        className="room-summary-plan-floor"
        points={pointsAttr(outline.map(project))}
        style={{ fill: floorColor }}
      />
      {furniture.map((item) => (
        <polygon
          key={item.id}
          className="room-summary-plan-item"
          points={pointsAttr(
            rectCorners(item.position, item.size.width / 2, item.size.depth / 2, item.rotationY).map(project),
          )}
          style={{ fill: item.color }}
        />
      ))}
    </svg>
  );
}

/**
 * A printable, static summary of the active room and furnishing proposal — the
 * floor plan, the furniture list, and the validation score — so it can be taken
 * out of the browser: shown to a partner or landlord, handed to a furniture
 * store, or reviewed by a professional (#368). Opened from the printer icon in
 * the room top bar (see App.tsx). The browser's own print dialog ("Save as
 * PDF") is the export mechanism: `@media print` rules scoped to
 * `.room-summary-*` in index.css hide the rest of the app and lay this sheet
 * out for paper. A static, single-room snapshot only — no server-generated
 * PDF, no multi-room export.
 */
export function RoomSummary() {
  const open = useUiStore((s) => s.summaryOpen);
  const close = useUiStore((s) => s.closeSummary);
  const design = useDesignStore((s) => s.design);
  const report = useValidationStore((s) => s.report);
  const validate = useValidationStore((s) => s.validate);

  useEscape(close, open);

  // Same guarantee as ValidationScore: ensure a report exists once the summary
  // is opened, even if this is the first render since switching rooms.
  useEffect(() => {
    if (open && !report) validate();
  }, [open, report, validate]);

  if (!open) return null;

  const total = report?.total ?? null;
  const violated = report ? report.results.filter((r) => r.outcome.status === 'violated').length : 0;
  const passed = report ? report.results.filter((r) => r.outcome.status === 'passed').length : 0;

  return (
    <div className="modal-backdrop room-summary-backdrop" role="presentation" onClick={close}>
      <div
        className="modal room-summary-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Room summary"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head room-summary-toolbar">
          <span className="modal-title">Room summary</span>
          <div className="button-row">
            <button type="button" className="btn btn-accent" onClick={() => window.print()}>
              <Icon name="printer" /> Print / save PDF
            </button>
            <button type="button" className="btn-icon" aria-label="Close" onClick={close}>
              <Icon name="x" />
            </button>
          </div>
        </div>

        <div className="modal-body room-summary-body">
          <div className="room-summary-sheet">
            <header className="room-summary-head">
              <h1 className="room-summary-title">{design.name}</h1>
              <p className="hint">
                {design.room.height ? `Ceiling height ${formatCm(design.room.height)} · ` : ''}
                Generated {new Date().toLocaleDateString()}
              </p>
            </header>

            <section className="room-summary-section">
              <h2 className="room-summary-heading">Floor plan</h2>
              <SummaryPlan walls={design.walls} furniture={design.furniture} floorColor={design.floorColor} />
            </section>

            <section className="room-summary-section">
              <h2 className="room-summary-heading">Validation score</h2>
              <div className="validation-summary">
                <div className={`validation-total ${scoreClass(total)}`}>
                  <strong>{total === null ? '–' : `${total} pts`}</strong>
                  <span>of 100</span>
                </div>
                <div className="validation-meta">
                  <span>
                    {report && report.roomTypes.length > 0
                      ? `Interpreted as: ${report.roomTypes.map((t) => ROOM_TYPE_LABEL[t]).join(' + ')}`
                      : 'Room type unknown — add furniture to activate more rules.'}
                  </span>
                  <span>
                    {passed} passed · {violated} violated
                  </span>
                </div>
              </div>
            </section>

            <section className="room-summary-section">
              <h2 className="room-summary-heading">Furniture ({design.furniture.length})</h2>
              {design.furniture.length === 0 ? (
                <p className="hint">No furniture placed yet.</p>
              ) : (
                <ul className="room-summary-list">
                  {design.furniture.map((item) => (
                    <li key={item.id} className="room-summary-row">
                      <span
                        className="swatch room-summary-swatch"
                        style={{ background: item.color }}
                        aria-hidden="true"
                      />
                      <span className="room-summary-row-name">
                        {item.name || FURNITURE_CATALOG[item.kind].label}
                      </span>
                      <span className="room-summary-row-kind">{FURNITURE_CATALOG[item.kind].label}</span>
                      <span className="room-summary-row-size">
                        {formatCm(item.size.width)} × {formatCm(item.size.depth)} × {formatCm(item.size.height)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
