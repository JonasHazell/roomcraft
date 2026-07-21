import { describe, expect, it } from 'vitest';
import {
  FREE_ROOM_LIMIT,
  RoomCapExceededError,
  parseProjectEnvelope,
  saveProject,
} from './projects.ts';

function projectWithRooms(count: number) {
  return {
    schemaVersion: 5,
    name: 'My rooms',
    updatedAt: new Date().toISOString(),
    rooms: Array.from({ length: count }, (_, i) => ({ id: `room-${i}` })),
    activeRoomId: 'room-0',
  };
}

describe('parseProjectEnvelope', () => {
  it('accepts a well-formed project envelope', () => {
    const project = projectWithRooms(2);
    expect(parseProjectEnvelope(project)).toEqual(project);
  });

  it('rejects a malformed payload', () => {
    expect(() => parseProjectEnvelope({ name: 'x' })).toThrow();
    expect(() => parseProjectEnvelope({ ...projectWithRooms(1), rooms: 'not-an-array' })).toThrow();
    expect(() => parseProjectEnvelope(null)).toThrow();
  });

  it('caps the number of rooms accepted in a single payload', () => {
    expect(() => parseProjectEnvelope(projectWithRooms(51))).toThrow();
  });
});

describe('saveProject — free-tier room cap', () => {
  it('rejects a save over the cap without touching the database', async () => {
    // No DATABASE_URL in this test environment, so `pool` is null: if the cap
    // check ran after the database call, this would throw a *different* error
    // ("Project sync is not configured") instead of RoomCapExceededError —
    // proving the cap is enforced before any write is attempted, so a rejected
    // save can never leave partial data behind.
    const project = parseProjectEnvelope(projectWithRooms(FREE_ROOM_LIMIT + 1));
    await expect(saveProject('user-1', project)).rejects.toBeInstanceOf(RoomCapExceededError);
  });

  it('accepts a save at exactly the cap (rejects only over it)', async () => {
    const atLimit = parseProjectEnvelope(projectWithRooms(FREE_ROOM_LIMIT));
    // No pool configured, so this still throws — but the *other* error, proving
    // the cap check itself did not reject a within-limit save.
    await expect(saveProject('user-1', atLimit)).rejects.not.toBeInstanceOf(RoomCapExceededError);
  });
});
