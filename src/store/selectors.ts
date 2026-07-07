import type { FurnitureItem, Wall } from '../types';
import { useDesignStore } from './useDesignStore';
import { useUiStore } from './useUiStore';

/** The currently selected furniture piece, or undefined when none/other kind is selected. */
export function useSelectedFurniture(): FurnitureItem | undefined {
  const selection = useUiStore((s) => s.selection);
  return useDesignStore((s) =>
    selection?.kind === 'furniture'
      ? s.design.furniture.find((f) => f.id === selection.id)
      : undefined,
  );
}

/** The currently selected wall, or undefined when none/other kind is selected. */
export function useSelectedWall(): Wall | undefined {
  const selection = useUiStore((s) => s.selection);
  return useDesignStore((s) =>
    selection?.kind === 'wall' ? s.design.walls.find((w) => w.id === selection.id) : undefined,
  );
}
