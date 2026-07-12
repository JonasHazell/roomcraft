import { useEffect } from 'react';
import { ROOM_TEMPLATES, templatePath, type RoomTemplate } from '../../lib/roomTemplates';
import { Icon } from '../ui/Icon';

/**
 * The "New room" chooser: a small library of starting outlines (a few rectangle
 * sizes and an L-shape) plus a "Draw it yourself" option. Picking a template
 * fills in the exterior walls; drawing from scratch keeps the original blank
 * canvas. Shown as a shared `.modal` from the lobby.
 */
export function RoomTemplatePicker({
  onPick,
  onDrawYourself,
  onClose,
}: {
  onPick: (template: RoomTemplate) => void;
  onDrawYourself: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="New room"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <span className="modal-title">New room</span>
          <button type="button" className="btn-icon" aria-label="Close" onClick={onClose}>
            <Icon name="x" />
          </button>
        </div>

        <div className="modal-body">
          <p className="hint">
            Start from a template to fill in the walls, or draw the outline yourself. Everything
            stays editable afterwards.
          </p>
          <div className="template-grid">
            {ROOM_TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                className="template-card"
                onClick={() => onPick(t)}
              >
                <span className="template-preview" aria-hidden="true">
                  <svg viewBox="0 0 40 40" width="40" height="40">
                    <path d={templatePath(t.points)} />
                  </svg>
                </span>
                <span className="template-name">{t.name}</span>
                <span className="template-meta">{t.detail}</span>
              </button>
            ))}

            <button
              type="button"
              className="template-card template-card-blank"
              onClick={onDrawYourself}
            >
              <span className="template-preview" aria-hidden="true">
                <Icon name="pencil" />
              </span>
              <span className="template-name">Draw it yourself</span>
              <span className="template-meta">Start from a blank canvas</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
