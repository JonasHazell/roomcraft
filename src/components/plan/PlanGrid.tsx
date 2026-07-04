import type { Bounds } from '../../lib/polygon';

/** Grid with 1 m lines (snapping is 0.1 m but that isn't drawn — visual noise). */
export function PlanGrid({ bounds }: { bounds: Bounds }) {
  // Sparser lines when the view is zoomed out, otherwise the grid becomes a gray blur.
  const span = Math.max(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ);
  const step = span > 60 ? 10 : 1;
  const xs: number[] = [];
  const zs: number[] = [];
  for (let x = Math.ceil(bounds.minX / step) * step; x <= bounds.maxX; x += step) xs.push(x);
  for (let z = Math.ceil(bounds.minZ / step) * step; z <= bounds.maxZ; z += step) zs.push(z);

  return (
    <g className="plan-grid">
      {xs.map((x) => (
        <line key={`x${x}`} x1={x} y1={bounds.minZ} x2={x} y2={bounds.maxZ} />
      ))}
      {zs.map((z) => (
        <line key={`z${z}`} x1={bounds.minX} y1={z} x2={bounds.maxX} y2={z} />
      ))}
    </g>
  );
}
