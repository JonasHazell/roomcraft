import { useMemo } from 'react';
import { Html, Line } from '@react-three/drei';
import { useDesignStore } from '../../store/useDesignStore';
import { useSelectedFurniture } from '../../store/selectors';
import { dimensionLines, type DimensionLine } from '../../lib/dimensionLines';
import { formatCm } from '../../lib/polygon';
import { ACCENT, INK } from '../../lib/theme';

// Draw the runs just above the floor so they read as measurements laid over the
// room without z-fighting the floor or the selection footprint plane (y = 0.01).
const LINE_Y = 0.045;

/**
 * When a furniture piece is selected, draws a dashed dimension run from each side
 * of its footprint out to the nearest wall or neighbouring piece, each labelled
 * with the gap. This is the in-scene, spatial replacement for the old read-only
 * "N cm to wall · N cm to nearest piece" line in the furniture dialog: the same
 * relative measurements, but drawn where they belong — in the room, against the
 * things they measure to.
 *
 * Reads straight from live store state (the selected piece plus every wall and
 * other piece) so the runs recompute on every render — while the piece is dragged,
 * rotated or resized — the same way the score badge stays live.
 */
export function SelectionDimensions() {
  const selected = useSelectedFurniture();
  const walls = useDesignStore((s) => s.design.walls);
  const furniture = useDesignStore((s) => s.design.furniture);

  const lines = useMemo<DimensionLine[]>(() => {
    if (!selected) return [];
    // Rugs lie flat and are meant to be stood on, so they are never an obstacle
    // to measure a clearance to; the selected piece itself is excluded too.
    const others = furniture.filter((f) => f.id !== selected.id && f.kind !== 'rug');
    return dimensionLines(selected, walls, others);
  }, [selected, walls, furniture]);

  if (!selected || lines.length === 0) return null;

  return (
    <group>
      {lines.map((line, i) => {
        const color = line.target === 'furniture' ? ACCENT : INK;
        const mid = { x: (line.from.x + line.to.x) / 2, z: (line.from.z + line.to.z) / 2 };
        return (
          <group key={i}>
            <Line
              points={[
                [line.from.x, LINE_Y, line.from.z],
                [line.to.x, LINE_Y, line.to.z],
              ]}
              color={color}
              lineWidth={1.5}
              dashed
              dashSize={0.1}
              gapSize={0.07}
            />
            <Html position={[mid.x, LINE_Y, mid.z]} center pointerEvents="none" zIndexRange={[20, 0]}>
              <span
                className={`dim-label${line.target === 'furniture' ? ' dim-label-furniture' : ''}`}
              >
                {formatCm(line.distance)}
              </span>
            </Html>
          </group>
        );
      })}
    </group>
  );
}
