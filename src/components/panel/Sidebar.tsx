import { Section } from './fields';
import { RoomForm } from './RoomForm';
import { OpeningsEditor } from './OpeningsEditor';
import { FurniturePalette } from './FurniturePalette';
import { PropertiesPanel } from './PropertiesPanel';
import { SaveLoadPanel } from './SaveLoadPanel';

export function Sidebar() {
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
      <Section title="Möbler">
        <FurniturePalette />
      </Section>
      <Section title="Vald möbel">
        <PropertiesPanel />
      </Section>
      <Section title="Spara & ladda">
        <SaveLoadPanel />
      </Section>
      <footer className="sidebar-foot">Allt sparas lokalt i din webbläsare.</footer>
    </aside>
  );
}
