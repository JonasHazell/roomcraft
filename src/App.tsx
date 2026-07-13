import { lazy, Suspense, useEffect, useSyncExternalStore } from 'react';
import { Lobby } from './components/lobby/Lobby';
import { StyleGuide } from './components/styleguide/StyleGuide';
import { SelectionBar } from './components/panel/SelectionBar';
import { ActionBar } from './components/panel/ActionBar';
import { WallBar } from './components/panel/WallBar';
import { FloorBar } from './components/panel/FloorBar';
import { HistoryBar } from './components/panel/HistoryBar';
import { SidePanel } from './components/panel/SidePanel';
import { ValidationScore } from './components/panel/ValidationScore';
import { AiPanelButton } from './components/panel/AiPanelButton';
import { ProposalSwitcher } from './components/panel/ProposalSwitcher';
import { FurnitureDialog } from './components/panel/FurnitureDialog';
import { DialogHost } from './components/panel/DialogHost';
import { Icon } from './components/ui/Icon';
import { PlanEditor } from './components/plan/PlanEditor';
import { useDesignStore } from './store/useDesignStore';
import { useUiStore } from './store/useUiStore';
import { useDialogStore } from './store/useDialogStore';
import { useHistoryStore } from './store/useHistoryStore';
import { backToLobby } from './lib/nav';

// three.js and the whole 3D scene are the bulk of the bundle; load them only
// when a room is actually opened so the lobby/first paint stays light.
const Scene = lazy(() => import('./components/scene/Scene').then((m) => ({ default: m.Scene })));

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
      <Suspense fallback={<div className="scene-loading">Loading 3D view…</div>}>
        <Scene />
      </Suspense>
      <div className="room-topbar">
        <button
          type="button"
          className="btn room-back"
          onClick={backToLobby}
          title="Back to your rooms"
          aria-label="Back to your rooms"
        >
          <span aria-hidden="true">
            <Icon name="arrow-left" />
          </span>
          <span className="room-back-label">Rooms</span>
        </button>
        <span className="room-topbar-name">{roomName}</span>
      </div>
      <ProposalSwitcher />
      <div className="view-badges">
        <AiPanelButton />
        <ValidationScore />
      </div>
      <div className="viewport-hint">
        Drag to orbit · scroll to zoom · drag a piece to move it, its ring to rotate
      </div>
      <SidePanel />
      {/* Bottom dock in three fixed slots: the add-furniture pill locked to the
          left, the contextual bar for the current selection (if any) centred in the
          middle, and the standalone undo/redo pill locked to the right. The side
          pills stay put whether or not something is selected — the middle is simply
          empty when nothing is. */}
      <div className="selection-bar-wrap">
        <div className="dock-slot dock-left">
          <ActionBar />
        </div>
        <div className="dock-slot dock-mid">
          {!overlayOpen && <SelectionBar />}
          {!overlayOpen && <WallBar />}
          {!overlayOpen && <FloorBar />}
        </div>
        <div className="dock-slot dock-right">
          <HistoryBar />
        </div>
      </div>
    </main>
  );
}

/** The 2D floor-plan editor for the active room; "Done" returns to the lobby. */
function PlanView() {
  return (
    <main className="viewport">
      <PlanEditor />
    </main>
  );
}

/** Subscribe to the URL hash so `#styleguide` can open the component reference. */
function useHash(): string {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener('hashchange', cb);
      return () => window.removeEventListener('hashchange', cb);
    },
    () => window.location.hash,
    () => '',
  );
}

function App() {
  const appView = useUiStore((s) => s.appView);
  const hash = useHash();

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
        // Esc closes one overlay at a time: dialog › panel › selection. Dialogs
        // are already handled above; if a side panel is open let it close first
        // (SidePanel's own Esc handler does that) and keep the selection.
        if (useUiStore.getState().panel) return;
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

  // A dev/reference surface, reachable at #styleguide, that renders every shared
  // UI primitive from the real classes so the app stays visually consistent.
  if (hash === '#styleguide') return <StyleGuide />;

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
