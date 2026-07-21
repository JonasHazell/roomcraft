import type { Point } from '../../types';
import { dist, formatCm } from '../../lib/polygon';

interface Props {
  draft: Point[];
  hover: Point | null;
  /** Corner whose coordinate the cursor has snapped in line with. */
  guide: Point | null;
  closable: boolean;
  /** Index of the draft edge picked for exact-length editing, or null. */
  selectedEdge: number | null;
  /** Picks the draft edge `i` (spanning draft[i]..draft[i+1]) for length editing. */
  onSelectEdge: (index: number) => void;
  /**
   * The very first segment's press-drag start point, before it's committed to
   * `draft` on release. Every later segment already has a `last` placed corner
   * to preview from; the first one doesn't, so this stands in for it while a
   * press-drag is in progress and `draft` is still empty.
   */
  dragAnchor?: Point | null;
}

/** Drawing in progress: placed corners, rubber band to the cursor and live measurements. */
export function PlanDraft({
  draft,
  hover,
  guide,
  closable,
  selectedEdge,
  onSelectEdge,
  dragAnchor = null,
}: Props) {
  const last = draft[draft.length - 1] ?? dragAnchor ?? undefined;
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
      {/* Each placed edge is a fat, invisible pick target: tapping it selects the
          edge (highlighted below) so its exact length can be typed mid-draw,
          before the outline is closed. Stopping the pointer keeps the click from
          also placing a new corner on the canvas. The target stops short of both
          corners so a tap on a corner still falls through — to close the outline
          on the start corner, or to disambiguate the two edges meeting there. */}
      {draft.slice(0, -1).map((p, i) => {
        const q = draft[i + 1];
        const len = dist(p, q);
        if (len < 1e-6) return null;
        const trim = Math.min(0.2, len / 3);
        const ux = (q.x - p.x) / len;
        const uz = (q.z - p.z) / len;
        return (
          <line
            key={`edge-${i}`}
            x1={p.x + ux * trim}
            y1={p.z + uz * trim}
            x2={q.x - ux * trim}
            y2={q.z - uz * trim}
            className="draft-edge-hit"
            onPointerDown={(e) => {
              e.stopPropagation();
              onSelectEdge(i);
            }}
          />
        );
      })}
      {selectedEdge !== null && draft[selectedEdge] && draft[selectedEdge + 1] && (
        <line
          x1={draft[selectedEdge].x}
          y1={draft[selectedEdge].z}
          x2={draft[selectedEdge + 1].x}
          y2={draft[selectedEdge + 1].z}
          className="draft-edge-selected"
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
      {/* Before any corner is placed there is normally no rubber band to preview
          from, so show the pending first corner directly under the cursor —
          unless a press-drag is already under way, in which case its anchor
          (below) takes over as the fixed end of the rubber band instead. */}
      {draft.length === 0 && !dragAnchor && hover && (
        <circle cx={hover.x} cy={hover.z} r={0.08} className="draft-point" />
      )}
      {/* The first segment's press-drag start point: draft is still empty, so it
          isn't in `draft` yet, but it needs the same fixed dot every later
          segment's already-placed corner gets. */}
      {draft.length === 0 && dragAnchor && (
        <circle cx={dragAnchor.x} cy={dragAnchor.z} r={0.08} className="draft-point" />
      )}
      {closable && draft[0] && (
        <circle cx={draft[0].x} cy={draft[0].z} r={0.22} className="draft-close-ring" />
      )}
    </g>
  );
}
