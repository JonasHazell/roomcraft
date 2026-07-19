import { beforeEach, describe, expect, it } from 'vitest';
import { useDesignStore } from './useDesignStore';
import { useHistoryStore } from './useHistoryStore';
import { furnitureCorners, furnitureFits } from '../lib/collision';
import { defaultOpening, floorPolygon } from '../lib/polygon';
import { runValidation } from '../lib/validation/engine';
import { DEFAULT_FLOOR_COLOR, DEFAULT_WALL_COLOR } from '../types';

const store = () => useDesignStore.getState();

describe('per-proposal floor and wall colours', () => {
  beforeEach(() => {
    store().newProject();
  });

  it('recolours only the active proposal and keeps each proposal its own palette', () => {
    const first = store().design.activeProposalId;
    store().setColors({ floorColor: '#111111', wallColor: '#222222' });
    expect(store().design.floorColor).toBe('#111111');
    expect(store().design.wallColor).toBe('#222222');

    // A new proposal starts from the current palette, then diverges.
    const second = store().addProposal({ copyCurrent: false });
    expect(store().design.floorColor).toBe('#111111');
    store().setColors({ wallColor: '#333333' });
    expect(store().design.wallColor).toBe('#333333');

    // Switching back restores the first proposal's colours…
    store().setActiveProposal(first);
    expect(store().design.wallColor).toBe('#222222');
    expect(store().design.floorColor).toBe('#111111');

    // …and forward again the second's.
    store().setActiveProposal(second);
    expect(store().design.wallColor).toBe('#333333');
  });

  it('gives an applied AI layout its own palette', () => {
    const id = store().addProposalFromFurniture('AI', [], {
      floorColor: '#0a0a0a',
      wallColor: '#0b0b0b',
    });
    expect(store().design.activeProposalId).toBe(id);
    expect(store().design.floorColor).toBe('#0a0a0a');
    expect(store().design.wallColor).toBe('#0b0b0b');
  });

  it('a fresh room uses the default palette', () => {
    expect(store().design.floorColor).toBe(DEFAULT_FLOOR_COLOR);
    expect(store().design.wallColor).toBe(DEFAULT_WALL_COLOR);
    expect(store().design.proposals[0].floorColor).toBe(DEFAULT_FLOOR_COLOR);
  });
});

describe('naming and reordering proposals', () => {
  beforeEach(() => {
    store().newProject();
  });

  it('renames a proposal and falls back to a default name when blank', () => {
    const id = store().design.activeProposalId;
    store().renameProposal(id, '  Cosy layout  ');
    expect(store().design.proposals.find((p) => p.id === id)?.name).toBe('Cosy layout');

    // A blank name is not accepted — it falls back to the next free "Proposal N".
    store().renameProposal(id, '   ');
    expect(store().design.proposals.find((p) => p.id === id)?.name).toBe('Proposal 1');
  });

  it('reorders proposals by moving one to another position', () => {
    const first = store().design.activeProposalId;
    const second = store().addProposal({ copyCurrent: false });
    const third = store().addProposal({ copyCurrent: false });
    expect(store().design.proposals.map((p) => p.id)).toEqual([first, second, third]);

    // Drag the first onto the third's slot: it lands where the third was.
    store().reorderProposals(first, third);
    expect(store().design.proposals.map((p) => p.id)).toEqual([second, third, first]);

    // Reordering never changes which proposal is active.
    expect(store().design.activeProposalId).toBe(third);

    // A no-op move (unknown or identical ids) leaves the order untouched.
    store().reorderProposals(first, first);
    store().reorderProposals('nope', third);
    expect(store().design.proposals.map((p) => p.id)).toEqual([second, third, first]);
  });
});

describe('auto-arranging the current furniture', () => {
  beforeEach(() => {
    store().newProject();
    useHistoryStore.getState().clear();
  });

  const score = () => runValidation(store().design).total ?? 0;

  it('raises the design score in one undoable step, keeping the pieces', () => {
    // A bed and a nightstand dropped in the middle of the default room score
    // poorly (headboard off the wall, no bed access, stray nightstand).
    const bedId = store().addFurniture('bed');
    const nsId = store().addFurniture('nightstand');
    store().updateFurniture(bedId, { position: { x: 0, z: 0 } });
    store().updateFurniture(nsId, { position: { x: -1.5, z: 1.8 } });
    const idsBefore = store().design.furniture.map((f) => f.id).sort();
    const before = score();

    const result = store().autoArrange();

    expect(result).not.toBeNull();
    expect(result!.after).toBeGreaterThan(result!.before);
    expect(score()).toBeGreaterThan(before);
    // Same set of pieces, same ids — only their poses changed.
    expect(store().design.furniture.map((f) => f.id).sort()).toEqual(idsBefore);

    // The whole rearrange is a single undo step back to the prior layout.
    const arranged = score();
    useHistoryStore.getState().undo();
    expect(score()).toBe(before);
    useHistoryStore.getState().redo();
    expect(score()).toBe(arranged);
  });

  it('is a no-op that records no history when the room is empty', () => {
    const design = store().design;
    expect(store().autoArrange()).toBeNull();
    expect(store().design).toBe(design); // untouched reference — no write, no undo entry
    expect(useHistoryStore.getState().canUndo).toBe(false);
  });
});

describe('dragging an exterior corner', () => {
  beforeEach(() => {
    store().newProject();
  });

  // The default room is a 4×5 m rectangle: north/east/south/west in loop order.
  const polygon = () => store().design.walls.filter((w) => w.kind === 'exterior').map((w) => w.a);

  it('slides the two adjacent walls so the shared corner lands where dragged', () => {
    const [north, east] = store().design.walls;
    // NE corner is north.b === east.a === (2, -2.5). Drag it out to (3, -3).
    store().moveCorner(north.id, east.id, 3, -3);
    expect(polygon()).toEqual([
      { x: -2, z: -3 },
      { x: 3, z: -3 },
      { x: 3, z: 2.5 },
      { x: -2, z: 2.5 },
    ]);
  });

  it('works regardless of the order the two adjacent walls are passed', () => {
    const [north, east] = store().design.walls;
    store().moveCorner(east.id, north.id, 3, -3);
    expect(polygon()[1]).toEqual({ x: 3, z: -3 });
  });

  it('snaps the dragged corner to the grid', () => {
    const [north, east] = store().design.walls;
    store().moveCorner(north.id, east.id, 2.94, -3.06);
    expect(polygon()[1]).toEqual({ x: 2.9, z: -3.1 });
  });

  it('rejects a drag that would collapse a wall to zero length', () => {
    const before = polygon();
    const [north, east] = store().design.walls;
    // Pulling the NE corner onto the NW corner's x would make the north wall zero-length.
    store().moveCorner(north.id, east.id, -2, -2.5);
    expect(polygon()).toEqual(before);
  });

  it('ignores a corner whose two walls are not one horizontal and one vertical', () => {
    const before = polygon();
    const [north, , south] = store().design.walls;
    // north and south are both horizontal — not a real corner.
    store().moveCorner(north.id, south.id, 1, 1);
    expect(polygon()).toEqual(before);
  });
});

describe('discarding an undrawn new room', () => {
  const RECT = [
    { x: -2, z: -2.5 },
    { x: 2, z: -2.5 },
    { x: 2, z: 2.5 },
    { x: -2, z: 2.5 },
  ];

  beforeEach(() => {
    store().newProject();
  });

  it('drops a new room that was never drawn and reactivates the previous one', () => {
    const firstId = store().design.id;
    const newId = store().createRoom();
    expect(store().project.rooms).toHaveLength(2);
    expect(store().project.activeRoomId).toBe(newId);

    store().discardRoomIfUndrawn(newId);

    expect(store().project.rooms.map((r) => r.id)).toEqual([firstId]);
    expect(store().project.activeRoomId).toBe(firstId);
    expect(store().design.id).toBe(firstId);
  });

  it('keeps a new room once its outline has been drawn', () => {
    const newId = store().createRoom();
    const result = store().commitExteriorPolygon(RECT);
    expect(result.ok).toBe(true);

    store().discardRoomIfUndrawn(newId);

    expect(store().project.rooms.map((r) => r.id)).toContain(newId);
    expect(store().project.activeRoomId).toBe(newId);
  });

  it('leaves an empty home when the only room is undrawn', () => {
    store().loadProject({ ...store().project, rooms: [], activeRoomId: '' });
    const onlyId = store().createRoom();
    expect(store().project.rooms).toHaveLength(1);

    store().discardRoomIfUndrawn(onlyId);

    expect(store().project.rooms).toHaveLength(0);
    expect(store().project.activeRoomId).toBe('');
  });
});

describe('adding doors and windows to a wall', () => {
  const RECT = [
    { x: -2, z: -2.5 },
    { x: 2, z: -2.5 },
    { x: 2, z: 2.5 },
    { x: -2, z: 2.5 },
  ];

  beforeEach(() => {
    store().newProject();
    store().commitExteriorPolygon(RECT);
  });

  it('adds an opening on the given wall and returns its id', () => {
    const wallId = store().design.walls[0].id;
    const id = store().addOpening(defaultOpening('door', wallId));

    expect(id).toBeTruthy();
    const openings = store().design.openings;
    expect(openings).toHaveLength(1);
    expect(openings[0].id).toBe(id);
    expect(openings[0]).toMatchObject({ kind: 'door', wallId, elevation: 0 });
  });

  it('refuses an opening on a wall that does not exist', () => {
    expect(store().addOpening(defaultOpening('window', 'nope'))).toBeNull();
    expect(store().design.openings).toHaveLength(0);
  });

  it('updates and removes an opening', () => {
    const wallId = store().design.walls[0].id;
    const id = store().addOpening(defaultOpening('window', wallId))!;

    store().updateOpening(id, { width: 1.5, elevation: 1 });
    const updated = store().design.openings.find((o) => o.id === id)!;
    expect(updated.width).toBe(1.5);
    expect(updated.elevation).toBe(1);

    store().removeOpening(id);
    expect(store().design.openings).toHaveLength(0);
  });
});

describe('resizing a wall reclamps — never deletes — its openings', () => {
  const RECT = [
    { x: -2, z: -2.5 },
    { x: 2, z: -2.5 },
    { x: 2, z: 2.5 },
    { x: -2, z: 2.5 },
  ];

  beforeEach(() => {
    store().newProject();
    store().commitExteriorPolygon(RECT);
  });

  it('leaves a door untouched when the final length still comfortably fits it', () => {
    // A 4m wall (see RECT) with a default 0.9m door at offset 0.5m.
    const wallId = store().design.walls[0].id;
    const id = store().addOpening(defaultOpening('door', wallId))!;
    const before = store().design.openings.find((o) => o.id === id)!;

    // A single, final commit to 1.2m still fits the 0.9m door — clampOpening only
    // needs to nudge the offset inward, not touch its width.
    store().resizeWall(wallId, 1.2);

    const after = store().design.openings.find((o) => o.id === id)!;
    expect(after.width).toBe(before.width);
    expect(after.offset).toBeLessThanOrEqual(1.2 - after.width);
  });

  it('shrinks (but never removes) a door on a wall made genuinely too short for it', () => {
    const wallId = store().design.walls[0].id;
    const id = store().addOpening(defaultOpening('door', wallId))!; // 0.9m wide

    store().resizeWall(wallId, 0.4); // shorter than the door itself

    const openings = store().design.openings;
    expect(openings).toHaveLength(1); // still present — clampOpening reclamps, it never deletes
    const after = openings.find((o) => o.id === id)!;
    expect(after.width).toBeLessThanOrEqual(0.4);
  });

  it('a transient intermediate length (as fired by every keystroke) permanently shrinks the ' +
    'door even once the final length would have fit it fine — this is why the Length field ' +
    'must commit once (on blur/Enter), not on every keystroke', () => {
    const wallId = store().design.walls[0].id;
    const id = store().addOpening(defaultOpening('door', wallId))!; // 0.9m wide, 4m wall

    // Simulates selecting the existing "400" text and typing "1", "12", "120" —
    // each keystroke used to call resizeWall directly (see PlanWallPanel before
    // this fix), so the transient 1cm and 12cm values already happened for real.
    store().resizeWall(wallId, 0.01);
    store().resizeWall(wallId, 0.12);
    store().resizeWall(wallId, 1.2); // the actually-intended final length

    // 1.2m comfortably fits a 0.9m door, but the door never recovers from the
    // 1cm dip: clampOpening has no memory of the door's original width.
    const after = store().design.openings.find((o) => o.id === id)!;
    expect(after.width).toBeLessThan(0.9);
  });
});

describe('placing furniture clear of what is already in the room', () => {
  beforeEach(() => {
    store().newProject();
  });

  it('does not spawn a second piece embedded in the first (#146)', () => {
    // Two chairs (0.45 x 0.45 m) both land near the center of the default
    // 4 x 5 m room with only the old jitter; there is plainly room for both
    // side by side, so this exercises the fix rather than a too-full room.
    store().addFurniture('chair');
    store().addFurniture('chair');
    const [a, b] = store().design.furniture;
    const poly = floorPolygon(store().design.walls);
    expect(furnitureFits(b, poly, store().design.walls, [furnitureCorners(a, 0)])).toBe(true);
  });

  it('duplicating a piece (Ctrl+D) does not overlap the original', () => {
    const id = store().addFurniture('chair');
    store().duplicateFurniture(id);
    const [a, b] = store().design.furniture;
    const poly = floorPolygon(store().design.walls);
    expect(furnitureFits(b, poly, store().design.walls, [furnitureCorners(a, 0)])).toBe(true);
  });
});

describe('duplicating a room (#229)', () => {
  beforeEach(() => {
    store().newProject();
  });

  it('names the copy after its source, not a generic "Room N"', () => {
    store().renameRoom(store().design.id, 'Kitchen');
    const srcId = store().design.id;

    const copyId = store().duplicateRoom(srcId);

    const names = store().project.rooms.map((r) => r.name);
    expect(names).toContain('Kitchen copy');
    expect(store().project.rooms.find((r) => r.id === copyId)?.name).toBe('Kitchen copy');
  });

  it('falls back to a numbered suffix when the exact copy name is already taken', () => {
    store().renameRoom(store().design.id, 'Kitchen');
    const srcId = store().design.id;

    store().duplicateRoom(srcId); // "Kitchen copy"
    store().duplicateRoom(srcId); // "Kitchen copy" taken -> "Kitchen copy 2"

    const names = store().project.rooms.map((r) => r.name);
    expect(names).toEqual(['Kitchen', 'Kitchen copy', 'Kitchen copy 2']);
  });

  it('leaves the original room in the lobby and does not activate the copy', () => {
    const srcId = store().design.id;
    const copyId = store().duplicateRoom(srcId);

    expect(store().project.activeRoomId).toBe(srcId);
    expect(store().project.rooms.map((r) => r.id)).toContain(copyId);
  });
});
