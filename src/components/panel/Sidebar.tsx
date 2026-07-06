import { Section } from './fields';
import { RoomSwitcher } from './RoomSwitcher';
import { SaveLoadPanel } from './SaveLoadPanel';

/**
 * The app menu. Furniture-specific tools (colours, doors & windows, library, AI,
 * validation) live on contextual bars in the viewport. The drawer owns the
 * project-level structure: switching between rooms, creating rooms, editing a
 * room's floor plan, and saving/importing the whole project.
 */
export function Sidebar() {
  return (
    <aside className="sidebar">
      <header className="brand">
        <h1>Roomcraft</h1>
        <p>Draw your rooms &amp; furnish them in 3D</p>
      </header>
      <Section title="Rooms">
        <RoomSwitcher />
      </Section>
      <Section title="Saved projects">
        <SaveLoadPanel />
      </Section>
      <footer className="sidebar-foot">Everything is saved locally in your browser.</footer>
    </aside>
  );
}
