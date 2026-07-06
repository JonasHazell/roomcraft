import { useRef, useState } from 'react';
import { useDesignStore } from '../../store/useDesignStore';
import { useUiStore } from '../../store/useUiStore';
import { confirmDialog } from '../../store/useDialogStore';
import {
  deleteSave,
  exportProject,
  importProject,
  listSaves,
  loadSave,
  saveAs,
  syncActiveProposal,
  syncActiveRoom,
  type SaveInfo,
} from '../../lib/persistence';

/** The live project with the on-screen room and furnishing folded back in. */
function currentProject() {
  const s = useDesignStore.getState();
  return syncActiveRoom(s.project, syncActiveProposal(s.design));
}

export function SaveLoadPanel() {
  const name = useDesignStore((s) => s.project.name);
  const setProjectName = useDesignStore((s) => s.setProjectName);
  const loadProject = useDesignStore((s) => s.loadProject);
  const newProject = useDesignStore((s) => s.newProject);
  const select = useUiStore((s) => s.select);

  const [saves, setSaves] = useState<SaveInfo[]>(() => listSaves());
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = () => setSaves(listSaves());

  const onSave = () => {
    const trimmed = name.trim() || 'My project';
    saveAs(trimmed, currentProject());
    refresh();
    setError(null);
    setNotice(`Saved “${trimmed}”.`);
  };

  const onImport = async (file: File) => {
    try {
      const project = await importProject(file);
      loadProject(project);
      select(null);
      setError(null);
      setNotice(`Imported “${project.name}”.`);
    } catch (e) {
      setNotice(null);
      setError(e instanceof Error ? e.message : 'Import failed.');
    }
  };

  return (
    <div className="stack">
      <label className="field">
        <span className="field-label">Project name</span>
        <span className="field-input">
          <input type="text" value={name} onChange={(e) => setProjectName(e.target.value)} />
        </span>
      </label>
      <div className="button-row">
        <button type="button" className="btn btn-accent" onClick={onSave}>
          Save
        </button>
        <button
          type="button"
          className="btn"
          onClick={async () => {
            const ok = await confirmDialog({
              title: 'New project',
              message: 'Start over with a new project? Unsaved changes will be lost.',
              confirmLabel: 'Start over',
              danger: true,
            });
            if (ok) {
              newProject();
              select(null);
            }
          }}
        >
          New project
        </button>
      </div>

      {saves.length > 0 && (
        <ul className="save-list">
          {saves.map((s) => (
            <li key={s.name}>
              <button
                type="button"
                className="save-name"
                title={`Load “${s.name}”`}
                onClick={() => {
                  const p = loadSave(s.name);
                  if (p) {
                    loadProject(p);
                    select(null);
                    setNotice(`Loaded “${s.name}”.`);
                  }
                }}
              >
                {s.name}
                <span className="save-date">
                  {new Date(s.updatedAt).toLocaleDateString('sv-SE')}
                </span>
              </button>
              <button
                type="button"
                className="btn-icon"
                title="Delete save"
                aria-label={`Delete save ${s.name}`}
                onClick={async () => {
                  const ok = await confirmDialog({
                    title: 'Delete save',
                    message: `Delete the save “${s.name}”?`,
                    confirmLabel: 'Delete',
                    danger: true,
                  });
                  if (ok) {
                    deleteSave(s.name);
                    refresh();
                  }
                }}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="button-row">
        <button type="button" className="btn" onClick={() => exportProject(currentProject())}>
          Export JSON
        </button>
        <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
          Import JSON
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void onImport(file);
            e.target.value = '';
          }}
        />
      </div>

      {notice && <p className="hint">{notice}</p>}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
