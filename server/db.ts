import pg from 'pg';

const { Pool } = pg;

/**
 * Postgres connection for the auth system (users + sessions). Railway provisions
 * a Postgres service and exposes its URL as `DATABASE_URL` (add it as a reference
 * variable: `DATABASE_URL = ${{Postgres.DATABASE_URL}}`).
 *
 * Auth is optional: with no `DATABASE_URL` the pool is null and the server still
 * serves the app and — in dev — the (unauthenticated) rest of the API, so the
 * frontend-only workflow keeps working without a database.
 */
const DATABASE_URL = process.env.DATABASE_URL;

/** True when a database is configured, so the auth endpoints can be served. */
export const authEnabled = Boolean(DATABASE_URL);

/**
 * Railway's private network URL (`*.railway.internal`) and local Postgres speak
 * plain TCP; the public proxy host needs TLS. Enable SSL for anything else and
 * don't verify the chain (Railway terminates with its own cert).
 */
function needsSsl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    if (host === 'localhost' || host === '127.0.0.1') return false;
    if (host.endsWith('.railway.internal')) return false;
    return true;
  } catch {
    return false;
  }
}

export const pool = DATABASE_URL
  ? new Pool({
      connectionString: DATABASE_URL,
      ssl: needsSsl(DATABASE_URL) ? { rejectUnauthorized: false } : undefined,
      max: Math.max(1, Number(process.env.DATABASE_POOL_MAX ?? 5)),
    })
  : null;

/**
 * Creates the auth tables if they don't exist. Idempotent, so it runs on every
 * boot — for a two-table schema this is simpler and safer than a migration tool,
 * and adding columns later can move to real migrations if the schema grows.
 */
export async function initSchema(): Promise<void> {
  if (!pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id text PRIMARY KEY,
      email text NOT NULL UNIQUE,
      password_hash text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id text PRIMARY KEY,
      user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT now(),
      expires_at timestamptz NOT NULL
    );
  `);
  await pool.query('CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);');
}
