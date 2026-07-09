import { useEffect } from 'react';
import { Lobby } from './components/lobby/Lobby';
import { SelectionBar } from './components/panel/SelectionBar';
import { ActionBar } from './components/panel/ActionBar';
import { WallBar } from './components/panel/WallBar';
import { FloorBar } from './components/panel/FloorBar';
import { SidePanel } from './components/panel/SidePanel';
import { ProposalSwitcher } from './components/panel/ProposalSwitcher';
import { FurnitureDialog } from './components/panel/FurnitureDialog';
import { DialogHost } from './components/panel/DialogHost';
import { HistoryControls } from './components/panel/HistoryControls';
import { Scene } from './components/scene/Scene';
import { PlanEditor } from './components/plan/PlanEditor';
import { useDesignStore } from './store/useDesignStore';
import { useUiStore } from './store/useUiStore';
import { useDialogStore } from './store/useDialogStore';
import { useHistoryStore } from './store/useHistoryStore';
import { backToLobby } from './lib/nav';

/** The 3D furnishing view for the active room: only furnishing plus a way back. */
function FurnishView() {
  const roomName = useDesignStore((s) => s.design.name);
  // Any other menu/popup that owns the screen hides the contextual selection
  // bar (the piece/wall/floor pill) so it stops overlapping and blocking them.
  // The selection itself is kept, so the bar returns when the overlay closes,
  // and the always-present room-action bar stays — it is how panels are opened.
  const panel = useUiStore((s) => s.panel);
  const furnitureDialog = useUiStore((s) => s.furnitureDialog);
  const proposalMenuOpen = useUiStore((s) => s.proposalMenuOpen);
  const dialogActive = useDialogStore((s) => s.active);
  const overlayOpen = !!panel || !!furnitureDialog || !!dialogActive || proposalMenuOpen;
  return (
    <main className="viewport">
      <Scene />
      <div className="room-topbar">
        <button
          type="button"
          className="btn room-back"
          onClick={backToLobby}
          title="Back to your rooms"
          aria-label="Back to your rooms"
        >
          <span aria-hidden="true">←</span>
          <span className="room-back-label">Rooms</span>
        </button>
        <span className="room-topbar-name">{roomName}</span>
      </div>
      <ProposalSwitcher />
      <div className="viewport-hint">
        Drag to orbit · scroll to zoom · drag a furniture piece to move it
      </div>
      <SidePanel />
      {/* One bottom dock: the contextual bar for the current selection (if any)
          floats above the always-present room-action bar. */}
      <div className="selection-bar-wrap">
        {!overlayOpen && <SelectionBar />}
        {!overlayOpen && <WallBar />}
        {!overlayOpen && <FloorBar />}
        <ActionBar />
      </div>
    </main>
  );
}

/** The 2D floor-plan editor for the active room; "Done" returns to the lobby. */
function PlanView() {
  return (
    <main className="viewport">
      <PlanEditor />
      <HistoryControls />
    </main>
  );
}

function App() {
  const appView = useUiStore((s) => s.appView);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === 'INPUT' ||
          t.tagName === 'TEXTAREA' ||
          t.tagName === 'SELECT' ||
          t.isContentEditable)
      ) {
        return;
      }
      // While the furniture dialog or a confirm/prompt dialog is open it owns the
      // keyboard (Esc closes it), so don't also deselect or rotate behind it.
      if (useUiStore.getState().furnitureDialog || useDialogStore.getState().active) return;
      // Editing shortcuts only apply inside a room, never in the lobby.
      if (useUiStore.getState().appView === 'lobby') return;
      // Undo/redo work regardless of the current selection.
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) useHistoryStore.getState().redo();
        else useHistoryStore.getState().undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        useHistoryStore.getState().redo();
        return;
      }
      const { selection, select } = useUiStore.getState();
      if (e.key === 'Escape') {
        select(null);
        return;
      }
      if (!selection) return;
      if ((e.key === 'd' || e.key === 'D') && (e.ctrlKey || e.metaKey)) {
        if (selection.kind === 'furniture') {
          e.preventDefault();
          const newId = useDesignStore.getState().duplicateFurniture(selection.id);
          if (newId) select({ kind: 'furniture', id: newId });
        }
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selection.kind === 'furniture') {
          useDesignStore.getState().removeFurniture(selection.id);
          select(null);
        } else if (selection.kind === 'wall') {
          // Only interior walls can be removed; the store ignores exterior walls.
          useDesignStore.getState().removeWall(selection.id);
          select(null);
        }
      } else if ((e.key === 'r' || e.key === 'R') && selection.kind === 'furniture') {
        const { design, updateFurniture } = useDesignStore.getState();
        const item = design.furniture.find((f) => f.id === selection.id);
        // R rotates right (clockwise from above), Shift+R left.
        const step = e.shiftKey ? Math.PI / 2 : -Math.PI / 2;
        if (item) updateFurniture(selection.id, { rotationY: item.rotationY + step });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="app">
      {appView === 'lobby' && <Lobby />}
      {appView === 'plan' && <PlanView />}
      {appView === 'furnish' && <FurnishView />}
      <FurnitureDialog />
      <DialogHost />
    </div>
  );
}

export default App;
