import { z } from 'zod';
import { pool } from './db.ts';

/**
 * Free-tier saved-room cap: VISION.md's freemium model names "a couple of saved
 * rooms" for the free tier, unlimited for Pro. There is no Pro/paid plan or
 * billing yet (see issue #369 — that's explicitly out of scope here), so every
 * signed-in account is on this tier today; this constant is the one place that
 * changes once a paid plan exists to exempt Pro accounts from it.
 */
export const FREE_ROOM_LIMIT = 3;

/** Thrown by {@link saveProject} when a save would leave more rooms than the free tier allows. */
export class RoomCapExceededError extends Error {
  readonly limit: number;
  constructor(limit: number) {
    super(
      `Free accounts can save up to ${limit} rooms to their account. Delete a room, or upgrade to Pro for unlimited rooms.`,
    );
    this.name = 'RoomCapExceededError';
    this.limit = limit;
  }
}

/**
 * Loose structural validation for the project payload synced from a signed-in
 * browser. Deliberately not the client's full schema/migration pipeline
 * (`src/lib/persistence.ts`'s `parseProject`) — that module reads/writes
 * `localStorage` and can't run under the server's DOM-free lib, and isn't
 * needed here: the client always sends its own already-normalized, current-
 * schema project (this is a synced mirror, not a file-import path). Only the
 * envelope the server itself reads (the room count, for the cap) and a sane
 * size bound are validated; the per-room contents are passed through as-is and
 * re-validated by the client's own schema the next time they're loaded.
 */
const projectEnvelopeSchema = z
  .object({
    schemaVersion: z.number(),
    name: z.string().max(200),
    updatedAt: z.string(),
    rooms: z.array(z.unknown()).max(50),
    activeRoomId: z.string(),
  })
  .passthrough();

export type ProjectEnvelope = z.infer<typeof projectEnvelopeSchema>;

/** Parses/validates the project payload from a client request; throws on malformed input. */
export function parseProjectEnvelope(raw: unknown): ProjectEnvelope {
  return projectEnvelopeSchema.parse(raw);
}

function requirePool() {
  if (!pool) throw new Error('Project sync is not configured (DATABASE_URL is unset).');
  return pool;
}

/** Loads the signed-in user's saved project, or null if they haven't saved one yet. */
export async function getSavedProject(userId: string): Promise<unknown | null> {
  const db = requirePool();
  const res = await db.query('SELECT data FROM projects WHERE user_id = $1', [userId]);
  const row = res.rows[0] as { data: unknown } | undefined;
  return row ? row.data : null;
}

/**
 * Saves (upserts) the signed-in user's project. The room cap is checked before
 * anything reaches the database, so a rejected save writes nothing at all —
 * the account's previously-saved project (if any) is left exactly as it was.
 */
export async function saveProject(userId: string, project: ProjectEnvelope): Promise<void> {
  if (project.rooms.length > FREE_ROOM_LIMIT) {
    throw new RoomCapExceededError(FREE_ROOM_LIMIT);
  }
  const db = requirePool();
  await db.query(
    `INSERT INTO projects (user_id, data, updated_at) VALUES ($1, $2, now())
     ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
    [userId, JSON.stringify(project)],
  );
}
