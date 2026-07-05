import { useEffect } from 'react';
import { Sidebar } from './components/panel/Sidebar';
import { SelectionBar } from './components/panel/SelectionBar';
import { Scene } from './components/scene/Scene';
import { PlanEditor } from './components/plan/PlanEditor';
import { useDesignStore } from './store/useDesignStore';
import { useUiStore } from './store/useUiStore';

function App() {
  const mode = useUiStore((s) => s.mode);
  const setMode = useUiStore((s) => s.setMode);
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const setSidebarOpen = useUiStore((s) => s.setSidebarOpen);

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
        } else {
          // Only interior walls can be removed; the store ignores exterior walls.
          useDesignStore.getState().removeWall(selection.id);
        }
        select(null);
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
    <div className={`app${sidebarOpen ? ' sidebar-open' : ''}`}>
      <button
        type="button"
        className="menu-toggle"
        aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={sidebarOpen}
        onClick={toggleSidebar}
      >
        {sidebarOpen ? '✕' : '☰'}
      </button>
      <Sidebar />
      <div
        className="sidebar-backdrop"
        role="presentation"
        onClick={() => setSidebarOpen(false)}
      />
      <main className="viewport">
        {mode === '2d' ? <PlanEditor /> : <Scene />}
        <nav className="mode-tabs">
          <button
            type="button"
            className={mode === '2d' ? 'active' : ''}
            onClick={() => setMode('2d')}
          >
            Floor plan
          </button>
          <button
            type="button"
            className={mode === '3d' ? 'active' : ''}
            onClick={() => setMode('3d')}
          >
            3D view
          </button>
        </nav>
        {mode === '3d' && (
          <div className="viewport-hint">
            Drag to orbit · scroll to zoom · drag a furniture piece to move it
          </div>
        )}
      </main>
      <SelectionBar />
    </div>
  );
}

export default App;
