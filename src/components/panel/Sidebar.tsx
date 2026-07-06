import { Section } from './fields';
import { SaveLoadPanel } from './SaveLoadPanel';

/**
 * The app menu. Everything room-specific (room colours, doors & windows,
 * library, AI, validation) now lives on contextual bars in the viewport, so the
 * drawer keeps only the global, design-level actions: naming, saving, switching
 * between rooms and import/export.
 */
export function Sidebar() {
  return (
    <aside className="sidebar">
      <header className="brand">
        <h1>Roomcraft</h1>
        <p>Draw your room &amp; furnish it in 3D</p>
      </header>
      <Section title="Saved rooms">
        <SaveLoadPanel />
      </Section>
      <footer className="sidebar-foot">Everything is saved locally in your browser.</footer>
    </aside>
  );
}
