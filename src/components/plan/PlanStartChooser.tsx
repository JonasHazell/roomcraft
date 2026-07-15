import { ROOM_TEMPLATES, templatePath, type RoomTemplate } from '../../lib/roomTemplates';
import type { Point } from '../../types';
import { Icon } from '../ui/Icon';

/**
 * The empty-state chooser for the wizard's "Draw the walls" step: pick a ready
 * shape to fill the outline in, or choose to draw it by hand. Shown over the
 * plan canvas only while the room has no walls yet; picking either option clears
 * it. Reuses the shared `.template-*` primitives from the old room picker so the
 * two never drift.
 */
export function PlanStartChooser({
  onPick,
  onDraw,
}: {
  onPick: (points: Point[]) => void;
  onDraw: () => void;
}) {
  const pick = (t: RoomTemplate) => onPick(t.points);
  return (
    <div className="plan-chooser">
      <div className="plan-chooser-sheet">
        <p className="hint plan-chooser-lede">
          Start from a shape to fill in the walls, or draw the outline yourself — everything
          stays editable afterwards.
        </p>
        <div className="template-grid">
          {ROOM_TEMPLATES.map((t) => (
            <button key={t.id} type="button" className="template-card" onClick={() => pick(t)}>
              <span className="template-preview" aria-hidden="true">
                <svg viewBox="0 0 40 40" width="40" height="40">
                  <path d={templatePath(t.points)} />
                </svg>
              </span>
              <span className="template-name">{t.name}</span>
              <span className="template-meta">{t.detail}</span>
            </button>
          ))}
          <button type="button" className="template-card template-card-blank" onClick={onDraw}>
            <span className="template-preview" aria-hidden="true">
              <Icon name="pencil" />
            </span>
            <span className="template-name">Draw it yourself</span>
            <span className="template-meta">Start from a blank canvas</span>
          </button>
        </div>
      </div>
    </div>
  );
}
