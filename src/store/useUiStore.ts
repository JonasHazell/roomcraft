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
 * The step of the guided "New room" wizard, or null when it isn't running. The
 * wizard walks a new room through naming it, drawing its walls and adding doors
 * and windows, then drops the user straight into the 3D view — each step showing
 * only the controls relevant to it. `walls` and `openings` are the two floor-plan
 * steps (drawn by the plan editor); `name` is the opening form.
 */
export type WizardStep = 'name' | 'walls' | 'openings';

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
  /**
   * The active step of the guided "New room" wizard, or null when it isn't
   * running. When set, the app shows the wizard instead of the lobby/plan/furnish
   * surfaces (see App.tsx). The room being built is the provisional
   * {@link pendingRoomId}, discarded if the wizard is cancelled.
   */
  wizardStep: WizardStep | null;
  furnitureDialog: FurnitureDialog;
  /** Whether the sign-in / create-account dialog is open. */
  authDialogOpen: boolean;
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
  setWizardStep: (step: WizardStep | null) => void;
  openAddFurniture: () => void;
  openEditFurniture: (id: string) => void;
  closeFurnitureDialog: () => void;
  openAuthDialog: () => void;
  closeAuthDialog: () => void;
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
  wizardStep: null,
  furnitureDialog: null,
  authDialogOpen: false,
  panel: null,
  proposalMenuOpen: false,
  select: (selection) =>
    set((state) => {
      // Making a new object selection dismisses a competing side panel so the
      // selection's own contextual bar is visible and the two never fight for
      // space.
      return { selection, panel: selection ? null : state.panel };
    }),
  setDragging: (draggingId) => set({ draggingId }),
  // Leaving a surface closes the transient proposal menu so its open flag can't
  // linger and hide the selection bar after we return to the 3D view.
  setAppView: (appView) => set({ appView, proposalMenuOpen: false }),
  setProposalMenuOpen: (proposalMenuOpen) => set({ proposalMenuOpen }),
  setPlanStartTool: (planStartTool) => set({ planStartTool }),
  setPendingRoomId: (pendingRoomId) => set({ pendingRoomId }),
  setWizardStep: (wizardStep) => set({ wizardStep }),
  openAddFurniture: () => set({ furnitureDialog: { mode: 'create' } }),
  openEditFurniture: (id) =>
    set({ selection: { kind: 'furniture', id }, furnitureDialog: { mode: 'edit', id } }),
  closeFurnitureDialog: () => set({ furnitureDialog: null }),
  openAuthDialog: () => set({ authDialogOpen: true }),
  closeAuthDialog: () => set({ authDialogOpen: false }),
  openPanel: (panel) => set({ panel }),
  closePanel: () => set({ panel: null }),
}));
