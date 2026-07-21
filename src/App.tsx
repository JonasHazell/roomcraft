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
import { ProposalSwitcher } from './components/panel/ProposalSwitcher';
import { EmptyRoomPrompt } from './components/panel/EmptyRoomPrompt';
import { FurnitureDialog } from './components/panel/FurnitureDialog';
import { DialogHost } from './components/panel/DialogHost';
import { ShortcutsReference } from './components/panel/ShortcutsReference';
import { UpgradeDialog } from './components/panel/UpgradeDialog';
import { RoomSummary } from './components/summary/RoomSummary';
import { AuthDialog } from './components/auth/AuthDialog';
import { RoomCapDialog } from './components/auth/RoomCapDialog';
import { SaveErrorBanner } from './components/ui/SaveErrorBanner';
import { Icon } from './components/ui/Icon';
import { PlanEditor } from './components/plan/PlanEditor';
import { useDesignStore } from './store/useDesignStore';
import { useUiStore } from './store/useUiStore';
import { useDialogStore } from './store/useDialogStore';
import { useAuthStore } from './store/useAuthStore';
import { backToLobby } from './lib/nav';
import { handleGlobalKeydown } from './lib/globalKeydown';
import { initProjectSync } from './lib/projectSync';

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
  const openShortcuts = useUiStore((s) => s.openShortcuts);
  const openSummary = useUiStore((s) => s.openSummary);
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
        {/* Keyboard shortcuts (#227) lives here rather than the bottom dock's
            ActionBar: that dock has no width to spare at narrow viewports (see
            ActionBar.tsx), while this row has real slack on both sides of the
            centred proposal switcher at every supported width. */}
        <button
          type="button"
          className="btn room-topbar-icon"
          onClick={openShortcuts}
          title="Keyboard shortcuts"
          aria-label="Keyboard shortcuts"
        >
          <span aria-hidden="true">
            <Icon name="keyboard" />
          </span>
        </button>
        {/* Print/export summary (#368) lives here too — a room-scoped action
            reachable regardless of selection or pointer type, same rationale as
            the keyboard-shortcuts icon right next to it. */}
        <button
          type="button"
          className="btn room-topbar-icon"
          onClick={openSummary}
          title="Print / export room summary"
          aria-label="Print / export room summary"
        >
          <span aria-hidden="true">
            <Icon name="printer" />
          </span>
        </button>
        <span className="room-topbar-name">{roomName}</span>
      </div>
      <ProposalSwitcher />
      {/* Never a blank page: a first-time user landing in an empty proposal gets a
          calm, dismissible nudge with the two "get help furnishing" actions. It
          hides while any other overlay owns the screen (same as the dock's
          contextual bars) and vanishes once the room has furniture. */}
      {!overlayOpen && <EmptyRoomPrompt />}
      <ValidationScore />
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
  const summaryOpen = useUiStore((s) => s.summaryOpen);
  const hash = useHash();

  // Establish the session once on load; the store's `enabled`/`user` then drive
  // whether sign-in is shown and whether AI furnishing is gated behind it.
  // `initProjectSync` wires the account-sync side effects (see lib/projectSync.ts)
  // that key off that same `user` transition, so it must be set up before refresh()
  // can resolve.
  useEffect(() => {
    initProjectSync();
    void useAuthStore.getState().refresh();
  }, []);

  // The app's single global keydown handler (undo/redo, Esc, selection
  // shortcuts) lives in `lib/globalKeydown.ts` so it can be unit tested
  // without rendering the component tree.
  useEffect(() => {
    window.addEventListener('keydown', handleGlobalKeydown);
    return () => window.removeEventListener('keydown', handleGlobalKeydown);
  }, []);

  // A dev/reference surface, reachable at #styleguide, that renders every shared
  // UI primitive from the real classes so the app stays visually consistent.
  if (hash === '#styleguide') return <StyleGuide />;

  // While the room summary is open, `@media print` (index.css) hides every
  // other `.app` child so printing (or "Save as PDF") produces only the
  // summary sheet, not the 3D view/dock underneath it.
  return (
    <div className={summaryOpen ? 'app app-printing' : 'app'}>
      {appView === 'lobby' && <Lobby />}
      {appView === 'plan' && <PlanView />}
      {appView === 'furnish' && <FurnishView />}
      <FurnitureDialog />
      <DialogHost />
      <ShortcutsReference />
      <RoomSummary />
      <AuthDialog />
      <UpgradeDialog />
      <RoomCapDialog />
      <SaveErrorBanner />
    </div>
  );
}

export default App;
