import { useEffect } from 'react';
import { Sidebar } from './components/panel/Sidebar';
import { Scene } from './components/scene/Scene';
import { useDesignStore } from './store/useDesignStore';
import { useUiStore } from './store/useUiStore';

function App() {
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
      const { selectedId, select } = useUiStore.getState();
      if (e.key === 'Escape') {
        select(null);
        return;
      }
      if (!selectedId) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        useDesignStore.getState().removeFurniture(selectedId);
        select(null);
      } else if (e.key === 'r' || e.key === 'R') {
        const { design, updateFurniture } = useDesignStore.getState();
        const item = design.furniture.find((f) => f.id === selectedId);
        // R roterar åt höger (medurs uppifrån), Shift+R åt vänster.
        const step = e.shiftKey ? Math.PI / 2 : -Math.PI / 2;
        if (item) updateFurniture(selectedId, { rotationY: item.rotationY + step });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="app">
      <Sidebar />
      <main className="viewport">
        <Scene />
        <div className="viewport-hint">
          Dra för att snurra · scrolla för att zooma · dra en möbel för att flytta den
        </div>
      </main>
    </div>
  );
}

export default App;
