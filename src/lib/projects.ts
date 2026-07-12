import { nanoid } from 'nanoid';
import type { Project } from '../types';
import { useDesignStore } from '../store/useDesignStore';
import { useProjectsStore, type ProjectMeta } from '../store/useProjectsStore';
import { cloneProject, createEmptyProject, syncedProject } from '../store/designModel';

/**
 * Multi-project orchestration: the operations behind the lobby's "My projects"
 * list. Kept here — not in a store — so `useProjectsStore` and `useDesignStore`
 * stay decoupled (the same reason nav.ts exists). The invariant everything below
 * preserves: the active project's data lives only in the design store, and every
 * *other* project's data lives in the projects store's `stash`.
 */

/** The active project as it currently is on screen (room + proposal folded in). */
function liveProject(): Project {
  const { project, design } = useDesignStore.getState();
  return syncedProject(project, design);
}

/** First free "Project N" name. */
function nextProjectName(metas: ProjectMeta[]): string {
  const taken = new Set(metas.map((m) => m.name));
  let n = metas.length + 1;
  while (taken.has(`Project ${n}`)) n++;
  return `Project ${n}`;
}

function metaFrom(id: string, p: Project): ProjectMeta {
  return { id, name: p.name, updatedAt: p.updatedAt };
}

/** Refreshes the active project's row (name/updatedAt) from its live data. */
function withRefreshedActiveMeta(metas: ProjectMeta[], activeId: string, live: Project): ProjectMeta[] {
  return metas.map((m) => (m.id === activeId ? metaFrom(activeId, live) : m));
}

/**
 * Seeds the workspace from the single existing project on first run — the
 * migration from the old one-workspace format (`roomcraft:current`) to the
 * multi-project list, with no data loss. Idempotent: a no-op once any project
 * exists.
 */
export function ensureProjectsInitialized(): void {
  if (useProjectsStore.getState().metas.length > 0) return;
  const live = liveProject();
  const id = nanoid(8);
  useProjectsStore.setState({ metas: [metaFrom(id, live)], activeId: id, stash: {} });
}

/** Switches the active project, stashing the current one first so nothing is lost. */
export function switchProject(id: string): void {
  const { activeId, stash, metas } = useProjectsStore.getState();
  if (id === activeId) return;
  const target = stash[id];
  if (!target) return;
  const live = liveProject();
  const nextStash = { ...stash, [activeId]: live };
  delete nextStash[id];
  useProjectsStore.setState({
    activeId: id,
    stash: nextStash,
    metas: withRefreshedActiveMeta(metas, activeId, live),
  });
  useDesignStore.getState().loadProject(target);
}

/** Creates a fresh, empty project and makes it active. Returns its id. */
export function createProject(name?: string): string {
  const { activeId, stash, metas } = useProjectsStore.getState();
  const live = liveProject();
  const id = nanoid(8);
  const project = createEmptyProject(name?.trim() || nextProjectName(metas));
  useProjectsStore.setState({
    activeId: id,
    stash: { ...stash, [activeId]: live },
    metas: [...withRefreshedActiveMeta(metas, activeId, live), metaFrom(id, project)],
  });
  useDesignStore.getState().loadProject(project);
  return id;
}

/** Renames a project (the active one also updates the live design store). */
export function renameProject(id: string, name: string): void {
  const trimmed = name.trim();
  if (!trimmed) return;
  const { activeId, metas, stash } = useProjectsStore.getState();
  useProjectsStore.setState({
    metas: metas.map((m) => (m.id === id ? { ...m, name: trimmed } : m)),
    stash: stash[id] ? { ...stash, [id]: { ...stash[id], name: trimmed } } : stash,
  });
  if (id === activeId) useDesignStore.getState().setProjectName(trimmed);
}

/**
 * Duplicates a project ("Save as") into a new copy placed right after it. The
 * active project is left as-is; the copy is stashed, ready to switch to.
 */
export function duplicateProject(id: string): string | null {
  const { activeId, metas, stash } = useProjectsStore.getState();
  const source = id === activeId ? liveProject() : stash[id];
  if (!source) return null;
  const newId = nanoid(8);
  const copy = cloneProject(source, `${source.name} copy`);
  const idx = metas.findIndex((m) => m.id === id);
  const nextMetas = withRefreshedActiveMeta(metas, activeId, liveProject());
  nextMetas.splice(idx + 1, 0, metaFrom(newId, copy));
  useProjectsStore.setState({ metas: nextMetas, stash: { ...stash, [newId]: copy } });
  return newId;
}

/**
 * Removes a project. Deleting the active one opens another (or a fresh empty
 * workspace when it was the last), so there is always an active project.
 */
export function deleteProject(id: string): void {
  const { activeId, metas, stash } = useProjectsStore.getState();
  const remaining = metas.filter((m) => m.id !== id);
  if (id !== activeId) {
    const nextStash = { ...stash };
    delete nextStash[id];
    useProjectsStore.setState({ metas: remaining, stash: nextStash });
    return;
  }
  const nextStash = { ...stash };
  if (remaining.length > 0) {
    const next = remaining[0];
    const target = nextStash[next.id] ?? createEmptyProject(next.name);
    delete nextStash[next.id];
    useProjectsStore.setState({ metas: remaining, activeId: next.id, stash: nextStash });
    useDesignStore.getState().loadProject(target);
  } else {
    const newId = nanoid(8);
    const project = createEmptyProject('My rooms');
    useProjectsStore.setState({ metas: [metaFrom(newId, project)], activeId: newId, stash: {} });
    useDesignStore.getState().loadProject(project);
  }
}
