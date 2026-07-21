import { create } from 'zustand';

export type Selection =
  | { kind: 'furniture' | 'wall'; id: string }
  /** Two or more furniture pieces selected as a group — built by shift/ctrl-click
   *  (desktop) or the "Select multiple" toggle (touch); see FurnitureMesh's
   *  onClick and `toggleFurnitureSelection` below. Furniture-only: walls and the
   *  floor keep their single-selection kinds above. */
  | { kind: 'furniture-multi'; ids: string[] }
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
 * A global side panel opened from the bottom action bar (AI, validation).
 * Independent of the current selection.
 */
export type Panel = 'ai' | 'validation' | null;

/**
 * The furniture add/edit dialog. `create` shows the type picker; picking a kind
 * places a default-configured piece right away and hands off to `edit`, which
 * opens the same form pre-filled with the (possibly just-placed) piece's values
 * (also reachable from the selection bar's "More").
 */
export type FurnitureDialog = { mode: 'create' } | { mode: 'edit'; id: string } | null;

interface UiState {
  selection: Selection;
  /**
   * Whether tapping another furniture piece adds it to the current selection
   * instead of replacing it — the touch-friendly alternative to desktop's
   * shift/ctrl-click, toggled from the selection bar's "Select multiple"
   * button (only surfaced on coarse pointers, which have no modifier keys).
   */
  multiSelectMode: boolean;
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
  /** Whether the sign-in / create-account dialog is open. */
  authDialogOpen: boolean;
  /** Whether the keyboard-shortcuts reference is open (see ShortcutsReference). */
  shortcutsOpen: boolean;
  /** Whether the printable room summary is open (see RoomSummary). */
  summaryOpen: boolean;
  panel: Panel;
  /**
   * Whether the proposal switcher's dropdown menu is open. Lifted out of the
   * component so other chrome (the contextual selection bar) can treat it as
   * just another open overlay and step aside for it.
   */
  proposalMenuOpen: boolean;
  select: (selection: Selection) => void;
  setMultiSelectMode: (active: boolean) => void;
  /** Add/remove one furniture piece from the current selection, promoting a
   *  single selection to `furniture-multi` or collapsing back down when only
   *  one id is left — see FurnitureMesh's onClick. */
  toggleFurnitureSelection: (id: string) => void;
  setDragging: (id: string | null) => void;
  setAppView: (view: AppView) => void;
  setProposalMenuOpen: (open: boolean) => void;
  setPlanStartTool: (tool: PlanStartTool) => void;
  setPendingRoomId: (id: string | null) => void;
  openAddFurniture: () => void;
  openEditFurniture: (id: string) => void;
  closeFurnitureDialog: () => void;
  openAuthDialog: () => void;
  closeAuthDialog: () => void;
  openShortcuts: () => void;
  closeShortcuts: () => void;
  openSummary: () => void;
  closeSummary: () => void;
  openPanel: (panel: Exclude<Panel, null>) => void;
  closePanel: () => void;
}

export const useUiStore = create<UiState>()((set) => ({
  selection: null,
  multiSelectMode: false,
  draggingId: null,
  // The app always opens on the lobby: a returning user picks a room, a new user
  // creates their first one.
  appView: 'lobby',
  planStartTool: 'select',
  pendingRoomId: null,
  furnitureDialog: null,
  authDialogOpen: false,
  shortcutsOpen: false,
  summaryOpen: false,
  panel: null,
  proposalMenuOpen: false,
  select: (selection) =>
    set((state) => {
      // Making a new object selection dismisses a competing side panel so the
      // selection's own contextual bar is visible and the two never fight for
      // space. A plain (non-additive) select always starts fresh, so it also
      // drops out of multi-select mode — only `toggleFurnitureSelection` below
      // keeps it active.
      return { selection, panel: selection ? null : state.panel, multiSelectMode: false };
    }),
  setMultiSelectMode: (multiSelectMode) =>
    set((state) => {
      if (!multiSelectMode) return { multiSelectMode };
      // Turning the mode on seeds the group with whatever single piece is
      // already selected, so the very next tap adds a second one to it.
      const { selection } = state;
      if (selection?.kind === 'furniture') {
        return { multiSelectMode, selection: { kind: 'furniture-multi', ids: [selection.id] } };
      }
      return { multiSelectMode };
    }),
  toggleFurnitureSelection: (id) =>
    set((state) => {
      const { selection } = state;
      let ids: string[];
      if (selection?.kind === 'furniture-multi') {
        ids = selection.ids.includes(id)
          ? selection.ids.filter((existing) => existing !== id)
          : [...selection.ids, id];
      } else if (selection?.kind === 'furniture') {
        ids = selection.id === id ? [] : [selection.id, id];
      } else {
        ids = [id];
      }
      if (ids.length === 0) return { selection: null, panel: state.panel };
      if (ids.length === 1) return { selection: { kind: 'furniture', id: ids[0] }, panel: null };
      return { selection: { kind: 'furniture-multi', ids }, panel: null };
    }),
  setDragging: (draggingId) => set({ draggingId }),
  // Leaving a surface closes the transient proposal menu so its open flag can't
  // linger and hide the selection bar after we return to the 3D view.
  setAppView: (appView) => set({ appView, proposalMenuOpen: false }),
  setProposalMenuOpen: (proposalMenuOpen) => set({ proposalMenuOpen }),
  setPlanStartTool: (planStartTool) => set({ planStartTool }),
  setPendingRoomId: (pendingRoomId) => set({ pendingRoomId }),
  // Opening the furniture dialog dismisses a competing side panel for the same
  // reason `select()` does above: the dialog visually covers the panel rather
  // than replacing it, so without this the panel would reappear over the room
  // the instant the dialog closes.
  openAddFurniture: () => set({ furnitureDialog: { mode: 'create' }, panel: null }),
  openEditFurniture: (id) =>
    set({
      selection: { kind: 'furniture', id },
      furnitureDialog: { mode: 'edit', id },
      panel: null,
    }),
  closeFurnitureDialog: () => set({ furnitureDialog: null }),
  openAuthDialog: () => set({ authDialogOpen: true }),
  closeAuthDialog: () => set({ authDialogOpen: false }),
  openShortcuts: () => set({ shortcutsOpen: true }),
  closeShortcuts: () => set({ shortcutsOpen: false }),
  openSummary: () => set({ summaryOpen: true }),
  closeSummary: () => set({ summaryOpen: false }),
  openPanel: (panel) => set({ panel }),
  closePanel: () => set({ panel: null }),
}));
