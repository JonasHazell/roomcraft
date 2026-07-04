import type { Point } from '../../types';
import { dist, formatCm } from '../../lib/polygon';

interface Props {
  draft: Point[];
  hover: Point | null;
  /** Corner whose coordinate the cursor has snapped in line with. */
  guide: Point | null;
  closable: boolean;
}

/** Drawing in progress: placed corners, rubber band to the cursor and live measurements. */
export function PlanDraft({ draft, hover, guide, closable }: Props) {
  const last = draft[draft.length - 1];
  const rubber = last && hover && !closable ? { a: last, b: hover } : null;
  const rubberLen = rubber ? dist(rubber.a, rubber.b) : 0;

  return (
    <g className="plan-draft">
      {draft.length >= 2 && (
        <polyline
          points={draft.map((p) => `${p.x},${p.z}`).join(' ')}
          className="draft-line"
        />
      )}
      {rubber && rubberLen > 0.001 && (
        <>
          <line
            x1={rubber.a.x}
            y1={rubber.a.z}
            x2={rubber.b.x}
            y2={rubber.b.z}
            className="draft-rubber"
          />
          <text
            x={(rubber.a.x + rubber.b.x) / 2}
            y={(rubber.a.z + rubber.b.z) / 2 - 0.18}
            className="draft-measure"
          >
            {formatCm(rubberLen)}
          </text>
        </>
      )}
      {guide && hover && !closable && (
        <>
          <line
            x1={guide.x}
            y1={guide.z}
            x2={hover.x}
            y2={hover.z}
            className="draft-guide"
          />
          <circle cx={guide.x} cy={guide.z} r={0.14} className="draft-guide-corner" />
        </>
      )}
      {draft.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.z} r={0.08} className="draft-point" />
      ))}
      {closable && draft[0] && (
        <circle cx={draft[0].x} cy={draft[0].z} r={0.22} className="draft-close-ring" />
      )}
    </g>
  );
}
