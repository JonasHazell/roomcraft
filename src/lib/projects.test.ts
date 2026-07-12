import { beforeEach, describe, expect, it } from 'vitest';
import { useDesignStore } from '../store/useDesignStore';
import { useProjectsStore } from '../store/useProjectsStore';
import {
  createProject,
  deleteProject,
  duplicateProject,
  ensureProjectsInitialized,
  renameProject,
  switchProject,
} from './projects';

const projects = () => useProjectsStore.getState();
const design = () => useDesignStore.getState();

beforeEach(() => {
  // Fresh single workspace, then reset the project list so each test seeds anew.
  design().newProject();
  useProjectsStore.setState({ metas: [], activeId: '', stash: {} });
  ensureProjectsInitialized();
});

describe('multi-project workspace', () => {
  it('seeds one project from the existing workspace (migration)', () => {
    expect(projects().metas).toHaveLength(1);
    expect(projects().activeId).toBe(projects().metas[0].id);
    // The active project's data stays live in the design store, not the stash.
    expect(projects().stash).toEqual({});
  });

  it('creates a new, separate project and makes it active', () => {
    const firstId = projects().activeId;
    const firstRoomCount = design().project.rooms.length;
    expect(firstRoomCount).toBeGreaterThan(0);

    const newId = createProject('Cabin');
    expect(projects().activeId).toBe(newId);
    expect(projects().metas).toHaveLength(2);
    // The new project starts empty…
    expect(design().project.rooms).toHaveLength(0);
    expect(design().project.name).toBe('Cabin');
    // …and the one we left is stashed intact (no data loss).
    expect(projects().stash[firstId].rooms).toHaveLength(firstRoomCount);
  });

  it('switches back to a project without losing its rooms', () => {
    const firstId = projects().activeId;
    const roomCount = design().project.rooms.length;
    const secondId = createProject('Cabin');

    switchProject(firstId);
    expect(projects().activeId).toBe(firstId);
    expect(design().project.rooms).toHaveLength(roomCount);
    // The project we left is now the stashed one.
    expect(projects().stash[secondId]).toBeDefined();
    expect(projects().stash[firstId]).toBeUndefined();
  });

  it('renames the active project in both the list and the design store', () => {
    const id = projects().activeId;
    renameProject(id, 'Renovation');
    expect(projects().metas.find((m) => m.id === id)?.name).toBe('Renovation');
    expect(design().project.name).toBe('Renovation');
  });

  it('duplicates a project into an independent copy', () => {
    const id = projects().activeId;
    const originalRooms = design().project.rooms.length;
    const copyId = duplicateProject(id);
    expect(copyId).not.toBeNull();
    expect(projects().metas).toHaveLength(2);
    const copy = projects().stash[copyId!];
    expect(copy.rooms).toHaveLength(originalRooms);
    // Fresh room ids — nothing shared with the source.
    const srcIds = new Set(design().project.rooms.map((r) => r.id));
    expect(copy.rooms.every((r) => !srcIds.has(r.id))).toBe(true);
  });

  it('deleting the active project opens another', () => {
    const firstId = projects().activeId;
    const secondId = createProject('Cabin');
    deleteProject(secondId);
    expect(projects().metas).toHaveLength(1);
    expect(projects().activeId).toBe(firstId);
    expect(projects().metas[0].id).toBe(firstId);
  });

  it('deleting the last project leaves a fresh empty workspace', () => {
    const id = projects().activeId;
    deleteProject(id);
    expect(projects().metas).toHaveLength(1);
    expect(design().project.rooms).toHaveLength(0);
  });
});
