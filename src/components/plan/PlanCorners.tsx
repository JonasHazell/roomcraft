import { useDesignStore } from '../../store/useDesignStore';

interface Props {
  /** A coarse (touch) pointer gets a larger grab target. */
  coarse: boolean;
  /** Starts a corner drag; the two ids are the walls meeting at the corner. */
  onCornerPointerDown: (wallAId: string, wallBId: string, e: React.PointerEvent) => void;
}

/**
 * Draggable handles at every corner of the exterior outline. A corner is the
 * point shared by two adjacent exterior walls (one horizontal, one vertical);
 * grabbing it drags both walls so the room can be reshaped by its corners.
 */
export function PlanCorners({ coarse, onCornerPointerDown }: Props) {
  const walls = useDesignStore((s) => s.design.walls);
  const exterior = walls.filter((w) => w.kind === 'exterior');
  if (exterior.length < 3) return null;
  // Touch needs a bigger invisible hit target than the visible dot.
  const hit = coarse ? 0.34 : 0.22;

  return (
    <g className="plan-corners">
      {exterior.map((w, i) => {
        // The corner at w.a is shared by the previous wall (which ends there) and w.
        const prev = exterior[(i - 1 + exterior.length) % exterior.length];
        const c = w.a;
        return (
          <g key={w.id} className="plan-corner">
            <circle
              cx={c.x}
              cy={c.z}
              r={hit}
              className="corner-hit"
              onPointerDown={(e) => onCornerPointerDown(prev.id, w.id, e)}
            />
            <circle cx={c.x} cy={c.z} r={0.11} className="corner-dot" />
          </g>
        );
      })}
    </g>
  );
}
