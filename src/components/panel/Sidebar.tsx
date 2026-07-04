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

  return (
    <aside className="sidebar">
      <header className="brand">
        <h1>Rumskiss</h1>
        <p>Rita ditt rum &amp; möblera det i 3D</p>
      </header>
      <Section title="Rum">
        <RoomForm />
      </Section>
      <Section title="Dörrar & fönster">
        <OpeningsEditor />
      </Section>
      {mode === '3d' && (
        <>
          <Section title="Möbler">
            <FurniturePalette />
          </Section>
          <Section title="Mitt bibliotek">
            <FurnitureLibrary />
          </Section>
          <Section title="AI-förslag">
            <AiProposalsPanel />
          </Section>
          <Section title="Validering">
            <ValidationPanel />
          </Section>
          <Section title="Vald möbel">
            <PropertiesPanel />
          </Section>
        </>
      )}
      <Section title="Spara & ladda">
        <SaveLoadPanel />
      </Section>
      <footer className="sidebar-foot">Allt sparas lokalt i din webbläsare.</footer>
    </aside>
  );
}
