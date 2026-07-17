import { beforeEach, describe, expect, it } from 'vitest';
import { useDesignStore } from '../store/useDesignStore';
import { useUiStore } from '../store/useUiStore';
import { ROOM_TEMPLATES } from './roomTemplates';
import { backToLobby, openRoomToFurnish, startNewRoom } from './nav';

const design = () => useDesignStore.getState();
const ui = () => useUiStore.getState();
/** A valid rectangular outline for commitExteriorPolygon. */
const rect = () => ROOM_TEMPLATES[0].points;

describe('new-room navigation', () => {
  beforeEach(() => {
    useDesignStore.getState().newProject();
    useUiStore.setState({ pendingRoomId: null, appView: 'lobby', selection: null });
  });

  it('opens straight in the plan editor with a provisional, auto-named room', () => {
    const before = design().project.rooms.length;
    const id = startNewRoom();

    // No wizard: the app lands on the plan surface with the exterior tool armed.
    expect(ui().appView).toBe('plan');
    expect(ui().planStartTool).toBe('exterior');
    expect(ui().pendingRoomId).toBe(id);
    expect(design().project.rooms.length).toBe(before + 1);
    expect(design().design.id).toBe(id);
    // A default name means the user never has to type anything.
    expect(design().design.name.trim().length).toBeGreaterThan(0);
  });

  it('furnishing keeps the room and lands in the 3D furnishing view', () => {
    const id = startNewRoom();
    design().commitExteriorPolygon(rect());

    openRoomToFurnish(id);

    expect(ui().pendingRoomId).toBeNull();
    expect(ui().appView).toBe('furnish');
    expect(design().project.rooms.some((r) => r.id === id)).toBe(true);
    expect(design().design.walls.some((w) => w.kind === 'exterior')).toBe(true);
  });

  it('leaving keeps a drawn room but discards an undrawn one', () => {
    // Drawn: leaving via "Done" folds it back into the lobby and keeps it.
    const drawnId = startNewRoom();
    design().commitExteriorPolygon(rect());
    backToLobby();
    expect(ui().appView).toBe('lobby');
    expect(ui().pendingRoomId).toBeNull();
    expect(design().project.rooms.some((r) => r.id === drawnId)).toBe(true);

    // Undrawn: leaving without an outline discards the provisional room.
    const before = design().project.rooms.length;
    const undrawnId = startNewRoom();
    backToLobby();
    expect(ui().appView).toBe('lobby');
    expect(ui().pendingRoomId).toBeNull();
    expect(design().project.rooms.some((r) => r.id === undrawnId)).toBe(false);
    expect(design().project.rooms.length).toBe(before);
  });
});
