import { useEffect, useMemo, useRef, useState } from 'react';
import type { Point } from '../../types';
import {
  dist,
  axisLock,
  pointsEqual,
  polygonBounds,
  snap,
  snapPoint,
  snapToCornerAxis,
  wallDir,
  type Bounds,
} from '../../lib/polygon';
import { useDesignStore } from '../../store/useDesignStore';
import { useUiStore } from '../../store/useUiStore';
import { PlanGrid } from './PlanGrid';
import { PlanWalls } from './PlanWalls';
import { PlanDraft } from './PlanDraft';
import { PlanToolbar } from './PlanToolbar';
import { PlanWallPanel } from './PlanWallPanel';

export type PlanTool = 'select' | 'exterior' | 'interior';

/** Klick inom denna radie från startpunkten stänger konturen. */
const CLOSE_RADIUS = 0.25;
const PAD = 2;
/** Zoomgränser: minsta/största synliga bredd i meter. */
const MIN_SPAN = 2;
const MAX_SPAN = 400;
/** Pekarrörelse i pixlar innan ett tryck räknas som panorering i stället för klick. */
const PAN_THRESHOLD = 4;

export function PlanEditor() {
  const walls = useDesignStore((s) => s.design.walls);
  const commitExteriorPolygon = useDesignStore((s) => s.commitExteriorPolygon);
  const addInteriorWall = useDesignStore((s) => s.addInteriorWall);
  const moveWall = useDesignStore((s) => s.moveWall);
  const removeWall = useDesignStore((s) => s.removeWall);
  const selection = useUiStore((s) => s.selection);
  const select = useUiStore((s) => s.select);

  const svgRef = useRef<SVGSVGElement>(null);
  const [tool, setTool] = useState<PlanTool>('select');
  const [draft, setDraft] = useState<Point[]>([]);
  const [hover, setHover] = useState<Point | null>(null);
  const [guide, setGuide] = useState<Point | null>(null);
  const [closable, setClosable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dragRef = useRef<{ id: string; horizontal: boolean } | null>(null);
  const panRef = useRef<{
    x: number;
    y: number;
    view: Bounds;
    scaleX: number;
    scaleZ: number;
    moved: boolean;
    deselectOnTap: boolean;
  } | null>(null);

  /** Användarens zoom/panorering; null = auto-anpassa vyn till innehållet. */
  const [view, setView] = useState<Bounds | null>(null);

  const fitBounds: Bounds = useMemo(() => {
    const pts = [...walls.flatMap((w) => [w.a, w.b]), ...draft];
    if (pts.length === 0) return { minX: -5, maxX: 5, minZ: -5, maxZ: 5 };
    const b = polygonBounds(pts);
    return {
      minX: b.minX - PAD,
      maxX: b.maxX + PAD,
      minZ: b.minZ - PAD,
      maxZ: b.maxZ + PAD,
    };
  }, [walls, draft]);

  const bounds = view ?? fitBounds;
  const boundsRef = useRef(bounds);
  boundsRef.current = bounds;

  // Scrollhjul zoomar mot markören. Nativ listener: Reacts onWheel är passiv
  // och kan inte hindra att sidan scrollar.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const b = boundsRef.current;
      const factor = Math.exp(e.deltaY * 0.0015);
      const span = (b.maxX - b.minX) * factor;
      if ((span < MIN_SPAN && factor < 1) || (span > MAX_SPAN && factor > 1)) return;
      const ctm = svg.getScreenCTM();
      if (!ctm) return;
      const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
      setView({
        minX: p.x - (p.x - b.minX) * factor,
        maxX: p.x + (b.maxX - p.x) * factor,
        minZ: p.y - (p.y - b.minZ) * factor,
        maxZ: p.y + (b.maxZ - p.y) * factor,
      });
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, []);

  const toWorld = (e: { clientX: number; clientY: number }): Point => {
    const ctm = svgRef.current?.getScreenCTM();
    if (!ctm) return { x: 0, z: 0 };
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    return { x: p.x, z: p.y };
  };

  /**
   * Snappat, axellåst markörläge; den fria koordinaten snappar dessutom till
   * redan utplacerade hörn så att konturen lätt hamnar i linje med sig själv.
   */
  const drawTarget = (raw: Point): { point: Point; guide: Point | null } => {
    const last = draft[draft.length - 1];
    if (!last) return { point: snapPoint(raw), guide: null };
    const p = snapPoint(axisLock(last, raw));
    const snapped = snapToCornerAxis(p, draft.slice(0, -1), p.z === last.z);
    // Snapp som drar ihop punkten till föregående hörn hindrar korta väggar.
    return pointsEqual(snapped.point, last) ? { point: p, guide: null } : snapped;
  };

  const cancelDraft = () => {
    setDraft([]);
    setError(null);
    setClosable(false);
    setGuide(null);
  };

  const tryClose = (points: Point[]) => {
    const result = commitExteriorPolygon(points);
    if (result.ok) {
      cancelDraft();
      setTool('select');
    } else {
      setError(result.reason);
    }
  };

  const appendExteriorPoint = (p: Point) => {
    const last = draft[draft.length - 1];
    if (last && pointsEqual(last, p)) return;
    if (draft.length >= 2) {
      // Hindra kanter som viker tillbaka längs föregående kant.
      const prev = draft[draft.length - 2];
      const d1 = wallDir({ a: prev, b: last });
      const d2 = wallDir({ a: last, b: p });
      const cross = d1.x * d2.z - d1.z * d2.x;
      const dot = d1.x * d2.x + d1.z * d2.z;
      if (Math.abs(cross) < 1e-6 && dot < 0) return;
    }
    setDraft([...draft, p]);
    setError(null);
  };

  /** Startar panorering; skalan (m/pixel) fångas vid start så att draget blir stabilt. */
  const startPan = (e: React.PointerEvent<SVGSVGElement>, deselectOnTap: boolean) => {
    const ctm = svgRef.current?.getScreenCTM();
    if (!ctm) return;
    const inv = ctm.inverse();
    const p0 = new DOMPoint(0, 0).matrixTransform(inv);
    const p1 = new DOMPoint(1, 1).matrixTransform(inv);
    panRef.current = {
      x: e.clientX,
      y: e.clientY,
      view: bounds,
      scaleX: p1.x - p0.x,
      scaleZ: p1.y - p0.y,
      moved: false,
      deselectOnTap,
    };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button === 1) {
      // Mittenknapp panorerar i alla lägen.
      e.preventDefault();
      startPan(e, false);
      return;
    }
    if (e.button !== 0) return;
    const raw = toWorld(e);
    if (tool === 'exterior') {
      if (draft.length >= 4 && dist(raw, draft[0]) <= CLOSE_RADIUS) {
        tryClose(draft);
      } else {
        appendExteriorPoint(drawTarget(raw).point);
      }
    } else if (tool === 'interior') {
      const p = drawTarget(raw).point;
      const last = draft[draft.length - 1];
      if (!last) {
        setDraft([p]);
      } else if (!pointsEqual(last, p)) {
        addInteriorWall(last, p);
        setDraft([p]);
      }
    } else {
      // Markera-läge: drag på tom yta panorerar, klick utan drag avmarkerar
      // vid släpp (väggar stoppar propagering).
      startPan(e, true);
    }
  };

  const onWallPointerDown = (id: string, e: React.PointerEvent) => {
    if (tool !== 'select' || e.button !== 0) return;
    e.stopPropagation();
    select({ kind: 'wall', id });
    const wall = walls.find((w) => w.id === id);
    if (!wall) return;
    dragRef.current = { id, horizontal: wall.a.z === wall.b.z };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const pan = panRef.current;
    if (pan) {
      if (!pan.moved && Math.hypot(e.clientX - pan.x, e.clientY - pan.y) < PAN_THRESHOLD) return;
      pan.moved = true;
      setView({
        minX: pan.view.minX - (e.clientX - pan.x) * pan.scaleX,
        maxX: pan.view.maxX - (e.clientX - pan.x) * pan.scaleX,
        minZ: pan.view.minZ - (e.clientY - pan.y) * pan.scaleZ,
        maxZ: pan.view.maxZ - (e.clientY - pan.y) * pan.scaleZ,
      });
      return;
    }
    const raw = toWorld(e);
    if (tool === 'select') {
      const drag = dragRef.current;
      if (drag) moveWall(drag.id, snap(drag.horizontal ? raw.z : raw.x));
      return;
    }
    const target = drawTarget(raw);
    setHover(target.point);
    setGuide(target.guide);
    setClosable(tool === 'exterior' && draft.length >= 4 && dist(raw, draft[0]) <= CLOSE_RADIUS);
  };

  const onPointerUp = () => {
    dragRef.current = null;
    const pan = panRef.current;
    if (pan) {
      if (!pan.moved && pan.deselectOnTap) select(null);
      panRef.current = null;
    }
  };

  // Esc avbryter pågående ritning, Enter/dubbelklick avslutar innerväggskedjan.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && (draft.length > 0 || tool !== 'select')) {
        cancelDraft();
        setTool('select');
      } else if (e.key === 'Enter' && tool === 'interior') {
        cancelDraft();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [draft.length, tool]);

  const startExterior = () => {
    const message =
      'Om du ritar om ytterväggarna tas dörrar och fönster på de nuvarande ' +
      'ytterväggarna bort när den nya konturen är klar. Fortsätt?';
    if (walls.some((w) => w.kind === 'exterior') && !window.confirm(message)) return;
    select(null);
    cancelDraft();
    setTool('exterior');
  };

  const startInterior = () => {
    select(null);
    cancelDraft();
    setTool('interior');
  };

  const startSelect = () => {
    cancelDraft();
    setTool('select');
  };

  const selectedWall =
    selection?.kind === 'wall' ? walls.find((w) => w.id === selection.id) : undefined;

  const deleteDisabledReason = !selectedWall
    ? 'Markera en innervägg för att ta bort den.'
    : selectedWall.kind === 'exterior'
      ? 'Ytterväggar tas inte bort styckvis — använd "Rita om ytterväggar…".'
      : undefined;

  return (
    <div className="plan-editor">
      <svg
        ref={svgRef}
        viewBox={`${bounds.minX} ${bounds.minZ} ${bounds.maxX - bounds.minX} ${bounds.maxZ - bounds.minZ}`}
        style={{ cursor: tool === 'select' ? 'default' : 'crosshair' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => {
          setHover(null);
          setGuide(null);
        }}
        onDoubleClick={() => tool === 'interior' && cancelDraft()}
      >
        <PlanGrid bounds={bounds} />
        <PlanWalls
          dimExterior={tool === 'exterior'}
          selectedWallId={selection?.kind === 'wall' ? selection.id : null}
          onWallPointerDown={onWallPointerDown}
        />
        {tool !== 'select' && (
          <PlanDraft draft={draft} hover={hover} guide={guide} closable={closable} />
        )}
      </svg>
      <div className="plan-overlay">
        <PlanToolbar
          tool={tool}
          error={error}
          canDelete={selectedWall?.kind === 'interior'}
          deleteDisabledReason={deleteDisabledReason}
          canResetView={view !== null}
          onSelectTool={startSelect}
          onExteriorTool={startExterior}
          onInteriorTool={startInterior}
          onResetView={() => setView(null)}
          onDelete={() => {
            if (selectedWall) {
              removeWall(selectedWall.id);
              select(null);
            }
          }}
        />
        {tool === 'select' && <PlanWallPanel />}
      </div>
    </div>
  );
}
