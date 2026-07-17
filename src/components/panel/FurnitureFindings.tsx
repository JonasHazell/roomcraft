import { useValidationStore } from '../../store/useValidationStore';
import { findingsForFurniture } from '../../lib/validation/furnitureFindings';

/**
 * A small, read-only list of the validation findings that reference the piece
 * currently being edited, shown inside the furniture dialog so the effect of an
 * edit on the always-visible score chip is explained without leaving the modal
 * (#253). It reuses ValidationPanel's per-issue severity cue and message styling
 * rather than duplicating the full panel — no click-to-highlight here, since the
 * 3D view sits behind the modal. Renders nothing when the piece is unflagged, to
 * avoid empty-state noise.
 */
export function FurnitureFindings({ furnitureId }: { furnitureId: string }) {
  const report = useValidationStore((s) => s.report);
  const findings = findingsForFurniture(report, furnitureId);
  if (findings.length === 0) return null;

  return (
    <div className="stack" role="status" aria-label="Validation findings for this piece">
      <p className="hint">Affecting your score:</p>
      <ul className="validation-list">
        {findings.map((f) => (
          <li key={f.key} className="validation-item-head">
            <span className={`severity severity-${f.importance}`}>{f.importance}</span>
            <span className="validation-message">{f.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
