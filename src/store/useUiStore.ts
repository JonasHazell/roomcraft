import { create } from 'zustand';

export type Selection =
  | { kind: 'furniture' | 'wall'; id: string }
  | { kind: 'floor' }
  | null;

/**
 * The app's top-level surface. `lobby` picks or creates rooms and edits their
 * floor plans; `plan` is the 2D floor-plan editor for one room; `furnish` is the
 * 3D furnishing view for one room. Choosing/creating rooms (lobby) is kept
 * separate from furnishing them (furnish).
 */
export type AppView = 'lobby' | 'plan' | 'furnish';

/** Which tool the floor-plan editor starts on when it is next opened. */
export type PlanStartTool = 'select' | 'exterior';

/**
 * A global side panel opened from the bottom action bar (AI, validation) or the
 * wall action bar (openings). Independent of the current selection, except
 * `openings`, which reads whichever wall is selected.
 */
export type Panel = 'ai' | 'validation' | 'openings' | null;

/**
 * The furniture add/edit dialog. `create` starts on the type picker and commits
 * a new piece on "Add"; `edit` opens the same form pre-filled with an existing
 * piece's values (opened from the selection bar's "More").
 */
export type FurnitureDialog = { mode: 'create' } | { mode: 'edit'; id: string } | null;

interface UiState {
  selection: Selection;
  draggingId: string | null;
  appView: AppView;
  /** Consumed once by the plan editor when it opens; then reset to 'select'. */
  planStartTool: PlanStartTool;
  /**
   * The room created by "New room" that hasn't been drawn yet. Set while its
   * outline is being drawn in the plan editor; leaving without drawing discards
   * it so an abandoned "New room" creates no room. Null once drawn or cleared.
   */
  pendingRoomId: string | null;
  furnitureDialog: FurnitureDialog;
  panel: Panel;
  /**
   * Whether the proposal switcher's dropdown menu is open. Lifted out of the
   * component so other chrome (the contextual selection bar) can treat it as
   * just another open overlay and step aside for it.
   */
  proposalMenuOpen: boolean;
  select: (selection: Selection) => void;
  setDragging: (id: string | null) => void;
  setAppView: (view: AppView) => void;
  setProposalMenuOpen: (open: boolean) => void;
  setPlanStartTool: (tool: PlanStartTool) => void;
  setPendingRoomId: (id: string | null) => void;
  openAddFurniture: () => void;
  openEditFurniture: (id: string) => void;
  closeFurnitureDialog: () => void;
  openPanel: (panel: Exclude<Panel, null>) => void;
  closePanel: () => void;
}

export const useUiStore = create<UiState>()((set) => ({
  selection: null,
  draggingId: null,
  // The app always opens on the lobby: a returning user picks a room, a new user
  // creates their first one.
  appView: 'lobby',
  planStartTool: 'select',
  pendingRoomId: null,
  furnitureDialog: null,
  panel: null,
  proposalMenuOpen: false,
  select: (selection) =>
    set((state) => {
      // Making a new object selection dismisses a competing side panel so the
      // selection's own contextual bar is visible and the two never fight for
      // space. The openings editor is the exception: it is meant to follow
      // whichever wall is selected, so keep it open when switching walls.
      const keepPanel = state.panel === 'openings' && selection?.kind === 'wall';
      return { selection, panel: selection && !keepPanel ? null : state.panel };
    }),
  setDragging: (draggingId) => set({ draggingId }),
  // Leaving a surface closes the transient proposal menu so its open flag can't
  // linger and hide the selection bar after we return to the 3D view.
  setAppView: (appView) => set({ appView, proposalMenuOpen: false }),
  setProposalMenuOpen: (proposalMenuOpen) => set({ proposalMenuOpen }),
  setPlanStartTool: (planStartTool) => set({ planStartTool }),
  setPendingRoomId: (pendingRoomId) => set({ pendingRoomId }),
  openAddFurniture: () => set({ furnitureDialog: { mode: 'create' } }),
  openEditFurniture: (id) =>
    set({ selection: { kind: 'furniture', id }, furnitureDialog: { mode: 'edit', id } }),
  closeFurnitureDialog: () => set({ furnitureDialog: null }),
  openPanel: (panel) => set({ panel }),
  closePanel: () => set({ panel: null }),
}));
