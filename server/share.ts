import { randomUUID } from 'node:crypto';
import { pool } from './db.ts';
import { parseDesign } from '../src/lib/persistence.ts';
import type { Design } from '../src/types.ts';

/** Thrown when a share is requested but no database is configured. */
export class ShareNotConfiguredError extends Error {
  constructor() {
    super('Sharing is not configured on this server.');
    this.name = 'ShareNotConfiguredError';
  }
}

function requirePool() {
  if (!pool) throw new ShareNotConfiguredError();
  return pool;
}

/**
 * Validates and stores a point-in-time snapshot of a room, returning its opaque
 * share id. Reuses `persistence.ts`'s own schema — the same one that guards
 * localStorage saves — so a share can never persist a malformed design; an
 * invalid `raw` throws (a ZodError or a structural `Error` from
 * `validateRoom`), which the caller in `index.ts` turns into a 400.
 *
 * The share is a snapshot, not a live link: later edits to the owner's room
 * never change what a previously-shared link shows.
 */
export async function createShare(raw: unknown): Promise<string> {
  const design = parseDesign(raw);
  const db = requirePool();
  const id = randomUUID();
  await db.query('INSERT INTO shared_rooms (id, design_json) VALUES ($1, $2)', [
    id,
    JSON.stringify(design),
  ]);
  return id;
}

/** Reads back a shared room snapshot by id, or null if it doesn't exist. */
export async function getShare(id: string): Promise<Design | null> {
  const db = requirePool();
  const res = await db.query('SELECT design_json FROM shared_rooms WHERE id = $1', [id]);
  const row = res.rows[0] as { design_json: Design } | undefined;
  return row ? row.design_json : null;
}
