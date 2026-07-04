import { useRef, useState } from 'react';
import { useDesignStore } from '../../store/useDesignStore';
import { useUiStore } from '../../store/useUiStore';
import {
  deleteSave,
  exportDesign,
  importDesign,
  listSaves,
  loadSave,
  saveAs,
  type SaveInfo,
} from '../../lib/persistence';

export function SaveLoadPanel() {
  const name = useDesignStore((s) => s.design.name);
  const setName = useDesignStore((s) => s.setName);
  const loadDesign = useDesignStore((s) => s.loadDesign);
  const newDesign = useDesignStore((s) => s.newDesign);
  const select = useUiStore((s) => s.select);

  const [saves, setSaves] = useState<SaveInfo[]>(() => listSaves());
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = () => setSaves(listSaves());

  const onSave = () => {
    const trimmed = name.trim() || 'My room';
    saveAs(trimmed, useDesignStore.getState().design);
    refresh();
    setError(null);
    setNotice(`Saved “${trimmed}”.`);
  };

  const onImport = async (file: File) => {
    try {
      const design = await importDesign(file);
      loadDesign(design);
      select(null);
      setError(null);
      setNotice(`Imported “${design.name}”.`);
    } catch (e) {
      setNotice(null);
      setError(e instanceof Error ? e.message : 'Import failed.');
    }
  };

  return (
    <div className="stack">
      <label className="field">
        <span className="field-label">Design name</span>
        <span className="field-input">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
        </span>
      </label>
      <div className="button-row">
        <button type="button" className="btn btn-accent" onClick={onSave}>
          Save
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => {
            if (window.confirm('Start over with a new design? Unsaved changes will be lost.')) {
              newDesign();
              select(null);
            }
          }}
        >
          New design
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
                  const d = loadSave(s.name);
                  if (d) {
                    loadDesign(d);
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
                onClick={() => {
                  if (window.confirm(`Delete the save “${s.name}”?`)) {
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
        <button
          type="button"
          className="btn"
          onClick={() => exportDesign(useDesignStore.getState().design)}
        >
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
