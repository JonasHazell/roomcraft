import { Section } from './fields';
import { RoomForm } from './RoomForm';
import { OpeningsEditor } from './OpeningsEditor';
import { FurnitureLibrary } from './FurnitureLibrary';
import { AiProposalsPanel } from './AiProposalsPanel';
import { ValidationPanel } from './ValidationPanel';
import { SaveLoadPanel } from './SaveLoadPanel';
import { useUiStore } from '../../store/useUiStore';
import { MOBILE_WIDTH, useMediaQuery } from '../../lib/useMediaQuery';

export function Sidebar() {
  const mode = useUiStore((s) => s.mode);
  // On phones the drawer is a long scroll, so secondary sections start collapsed
  // and only the primary ones (Room, Furniture) are open by default.
  const mobile = useMediaQuery(MOBILE_WIDTH);
  const secondaryOpen = !mobile;

  return (
    <aside className="sidebar">
      <header className="brand">
        <h1>Roomcraft</h1>
        <p>Draw your room &amp; furnish it in 3D</p>
      </header>
      <Section title="Room">
        <RoomForm />
      </Section>
      <Section title="Doors & windows" defaultOpen={secondaryOpen}>
        <OpeningsEditor />
      </Section>
      {mode === '3d' && (
        <>
          <Section title="My library" defaultOpen={secondaryOpen}>
            <FurnitureLibrary />
          </Section>
          <Section title="AI suggestions" defaultOpen={secondaryOpen}>
            <AiProposalsPanel />
          </Section>
          <Section title="Validation" defaultOpen={secondaryOpen}>
            <ValidationPanel />
          </Section>
        </>
      )}
      <Section title="Save & load" defaultOpen={secondaryOpen}>
        <SaveLoadPanel />
      </Section>
      <footer className="sidebar-foot">Everything is saved locally in your browser.</footer>
    </aside>
  );
}
