import { useShallow } from 'zustand/react/shallow';
import type { FurnitureItem, Wall } from '../types';
import { useDesignStore } from './useDesignStore';
import { useUiStore } from './useUiStore';

const NO_IDS: string[] = [];

/** The currently selected furniture piece, or undefined when none/other kind is selected. */
export function useSelectedFurniture(): FurnitureItem | undefined {
  const selection = useUiStore((s) => s.selection);
  return useDesignStore((s) =>
    selection?.kind === 'furniture'
      ? s.design.furniture.find((f) => f.id === selection.id)
      : undefined,
  );
}

/** The ids of every currently-selected furniture piece: one for a single
 *  selection, several for a multi-selection, empty otherwise — what the
 *  selection bar's bulk move/duplicate/delete actions operate over. */
export function useSelectedFurnitureIds(): string[] {
  return useUiStore(
    useShallow((s) => {
      if (s.selection?.kind === 'furniture') return [s.selection.id];
      if (s.selection?.kind === 'furniture-multi') return s.selection.ids;
      return NO_IDS;
    }),
  );
}

/** The currently selected wall, or undefined when none/other kind is selected. */
export function useSelectedWall(): Wall | undefined {
  const selection = useUiStore((s) => s.selection);
  return useDesignStore((s) =>
    selection?.kind === 'wall' ? s.design.walls.find((w) => w.id === selection.id) : undefined,
  );
}
