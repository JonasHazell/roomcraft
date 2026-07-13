import { beforeEach, describe, expect, it } from 'vitest';
import { backToLobby, createRoomAndDraw, finishPlanEditing, openRoomToPlan } from './nav';
import { useDesignStore } from '../store/useDesignStore';
import { useUiStore } from '../store/useUiStore';

const RECT = [
  { x: -2, z: -2.5 },
  { x: 2, z: -2.5 },
  { x: 2, z: 2.5 },
  { x: -2, z: 2.5 },
];

describe('finishing the plan editor', () => {
  beforeEach(() => {
    useDesignStore.getState().newProject();
  });

  it('hands a brand-new, just-drawn room straight into furnishing', () => {
    const firstId = useDesignStore.getState().design.id;
    const newId = createRoomAndDraw();
    expect(useUiStore.getState().pendingRoomId).toBe(newId);

    useDesignStore.getState().commitExteriorPolygon(RECT);
    finishPlanEditing();

    expect(useUiStore.getState().appView).toBe('furnish');
    expect(useUiStore.getState().pendingRoomId).toBeNull();
    expect(useDesignStore.getState().project.activeRoomId).toBe(newId);
    // The room the user came from is still there, untouched.
    expect(useDesignStore.getState().project.rooms.map((r) => r.id)).toContain(firstId);
  });

  it('discards a brand-new room abandoned without being drawn, back to the lobby', () => {
    const firstId = useDesignStore.getState().design.id;
    const newId = createRoomAndDraw();

    finishPlanEditing();

    expect(useUiStore.getState().appView).toBe('lobby');
    expect(useUiStore.getState().pendingRoomId).toBeNull();
    expect(useDesignStore.getState().project.rooms.map((r) => r.id)).toEqual([firstId]);
    expect(useDesignStore.getState().project.rooms.map((r) => r.id)).not.toContain(newId);
  });

  it('returns an already-existing room being re-edited to the lobby, not furnish', () => {
    const existingId = createRoomAndDraw();
    useDesignStore.getState().commitExteriorPolygon(RECT);
    // Leaving normally clears pendingRoomId, matching a room that was drawn in an
    // earlier session and is now being reopened via "Edit plan".
    backToLobby();
    openRoomToPlan(existingId);
    expect(useUiStore.getState().pendingRoomId).toBeNull();

    finishPlanEditing();

    expect(useUiStore.getState().appView).toBe('lobby');
    expect(useDesignStore.getState().project.rooms.map((r) => r.id)).toContain(existingId);
  });
});
