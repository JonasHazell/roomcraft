import type { Wall } from '../../types';
import {
  WALL_T,
  exteriorEndExtension,
  formatCm,
  outwardNormal,
  wallDir,
  wallLen,
  wallMidpoint,
} from '../../lib/polygon';
import { useDesignStore } from '../../store/useDesignStore';

interface Props {
  dimExterior: boolean;
  selectedWallId: string | null;
  onWallPointerDown: (id: string, e: React.PointerEvent) => void;
}

export function PlanWalls({ dimExterior, selectedWallId, onWallPointerDown }: Props) {
  const walls = useDesignStore((s) => s.design.walls);
  const openings = useDesignStore((s) => s.design.openings);

  return (
    <g className="plan-walls">
      {walls.map((w, i) => (
        <WallShape
          key={w.id}
          wall={w}
          walls={walls}
          index={i}
          dimmed={dimExterior && w.kind === 'exterior'}
          selected={w.id === selectedWallId}
          interactive={!dimExterior}
          openings={openings.filter((o) => o.wallId === w.id)}
          onPointerDown={onWallPointerDown}
        />
      ))}
    </g>
  );
}

function WallShape({
  wall: w,
  walls,
  index,
  dimmed,
  selected,
  interactive,
  openings,
  onPointerDown,
}: {
  wall: Wall;
  walls: Wall[];
  index: number;
  dimmed: boolean;
  selected: boolean;
  interactive: boolean;
  openings: { id: string; kind: 'door' | 'window'; offset: number; width: number }[];
  onPointerDown: (id: string, e: React.PointerEvent) => void;
}) {
  const d = wallDir(w);
  const n = outwardNormal(w);
  const exterior = w.kind === 'exterior';
  // Exterior walls are drawn outside the drawing line (inner edge on the line),
  // interior walls centered — same placement as in 3D. The end extension seals
  // the corners as in 3D.
  const off = exterior ? WALL_T / 2 : 0;
  const ext = exterior ? exteriorEndExtension(walls, index) : 0;
  const x1 = w.a.x + n.x * off;
  const y1 = w.a.z + n.z * off;
  const x2 = w.b.x + n.x * off + d.x * ext;
  const y2 = w.b.z + n.z * off + d.z * ext;

  const mid = wallMidpoint(w);
  const labelDist = exterior ? WALL_T + 0.38 : 0.32;
  const labelX = mid.x + n.x * labelDist;
  const labelY = mid.z + n.z * labelDist;

  return (
    <g
      className={[
        'plan-wall',
        exterior ? 'exterior' : 'interior',
        selected ? 'selected' : '',
        dimmed ? 'dimmed' : '',
      ].join(' ')}
    >
      <line x1={x1} y1={y1} x2={x2} y2={y2} className="wall-band" strokeWidth={WALL_T} />
      {openings.map((o) => {
        const ox1 = w.a.x + d.x * o.offset + n.x * off;
        const oy1 = w.a.z + d.z * o.offset + n.z * off;
        return (
          <line
            key={o.id}
            x1={ox1}
            y1={oy1}
            x2={ox1 + d.x * o.width}
            y2={oy1 + d.z * o.width}
            className={`wall-opening ${o.kind}`}
            strokeWidth={WALL_T}
          />
        );
      })}
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        className="wall-hit"
        strokeWidth={0.4}
        pointerEvents={interactive ? 'stroke' : 'none'}
        onPointerDown={(e) => onPointerDown(w.id, e)}
      />
      {!dimmed && (
        <text x={labelX} y={labelY} className="wall-measure">
          {formatCm(wallLen(w))}
        </text>
      )}
      {selected && (
        <>
          {/* Start point (offset 0) and arrow at the end — the end that moves when the length changes. */}
          <circle cx={w.a.x + n.x * off} cy={w.a.z + n.z * off} r={0.08} className="wall-end-start" />
          <polygon
            className="wall-end-arrow"
            points={[
              `${w.b.x + n.x * off + d.x * 0.26},${w.b.z + n.z * off + d.z * 0.26}`,
              `${w.b.x + n.x * off + n.x * 0.13},${w.b.z + n.z * off + n.z * 0.13}`,
              `${w.b.x + n.x * off - n.x * 0.13},${w.b.z + n.z * off - n.z * 0.13}`,
            ].join(' ')}
          />
        </>
      )}
    </g>
  );
}
