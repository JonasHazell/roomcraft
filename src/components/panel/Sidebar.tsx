import { Section } from './fields';
import { RoomForm } from './RoomForm';
import { OpeningsEditor } from './OpeningsEditor';
import { FurniturePalette } from './FurniturePalette';
import { FurnitureLibrary } from './FurnitureLibrary';
import { AiProposalsPanel } from './AiProposalsPanel';
import { ValidationPanel } from './ValidationPanel';
import { PropertiesPanel } from './PropertiesPanel';
import { SaveLoadPanel } from './SaveLoadPanel';
import { useUiStore } from '../../store/useUiStore';

export function Sidebar() {
  const mode = useUiStore((s) => s.mode);
  const setDrawerOpen = useUiStore((s) => s.setDrawerOpen);

  return (
    <aside className="sidebar">
      <header className="brand">
        <div className="brand-text">
          <h1>Roomcraft</h1>
          <p>Draw your room &amp; furnish it in 3D</p>
        </div>
        {/* Mobile-only: closes the drawer. Hidden on desktop via CSS. */}
        <button
          type="button"
          className="drawer-close"
          aria-label="Close panel"
          onClick={() => setDrawerOpen(false)}
        >
          ✕
        </button>
      </header>
      <Section title="Room">
        <RoomForm />
      </Section>
      <Section title="Doors & windows">
        <OpeningsEditor />
      </Section>
      {mode === '3d' && (
        <>
          <Section title="Furniture">
            <FurniturePalette />
          </Section>
          <Section title="My library">
            <FurnitureLibrary />
          </Section>
          <Section title="AI suggestions">
            <AiProposalsPanel />
          </Section>
          <Section title="Validation">
            <ValidationPanel />
          </Section>
          <Section title="Selected furniture">
            <PropertiesPanel />
          </Section>
        </>
      )}
      <Section title="Save & load">
        <SaveLoadPanel />
      </Section>
      <footer className="sidebar-foot">Everything is saved locally in your browser.</footer>
    </aside>
  );
}
