import { randomBytes, randomUUID, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { pool } from './db.ts';

const scrypt = promisify(scryptCb);

/** A user's subscription tier (#352). Every account starts on 'free'; 'pro' is
 * plumbing for the eventual upgrade — there's no real billing behind it yet. */
export type Plan = 'free' | 'pro';

/** A logged-in user as exposed to the client — never includes the password hash. */
export interface AuthUser {
  id: string;
  email: string;
  plan: Plan;
  /** Lifetime count of successful AI furnishing generations this account has run. */
  aiGenerationsUsed: number;
}

/** Name of the session cookie. */
export const SESSION_COOKIE = 'rc_session';

/** How long a session (and its cookie) lives before the user must sign in again. */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const SCRYPT_KEYLEN = 64;

// --- Password hashing (Node's built-in scrypt — no native dependency) --------

/**
 * Hashes a password with scrypt and a per-password random salt. The result is
 * self-describing (`scrypt$<saltHex>$<hashHex>`) so {@link verifyPassword} needs
 * nothing but the stored string.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = (await scrypt(password, salt, SCRYPT_KEYLEN)) as Buffer;
  return `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`;
}

/** Constant-time check of a password against a stored `scrypt$…` hash. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltHex, hashHex] = stored.split('$');
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const derived = (await scrypt(password, Buffer.from(saltHex, 'hex'), expected.length)) as Buffer;
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}

// --- Input validation --------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Minimum password length — enough to matter without frustrating users. */
export const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 200;

/** Returns the normalized (trimmed, lower-cased) email, or null if it's invalid. */
export function normalizeEmail(email: unknown): string | null {
  if (typeof email !== 'string') return null;
  const trimmed = email.trim().toLowerCase();
  if (trimmed.length < 3 || trimmed.length > 254 || !EMAIL_RE.test(trimmed)) return null;
  return trimmed;
}

/** True when the password meets the length policy. */
export function isValidPassword(password: unknown): password is string {
  return (
    typeof password === 'string' &&
    password.length >= MIN_PASSWORD_LENGTH &&
    password.length <= MAX_PASSWORD_LENGTH
  );
}

// --- Cookies -----------------------------------------------------------------

/** Parses a `Cookie:` header into a name→value map. */
export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const name = part.slice(0, eq).trim();
    if (name) out[name] = decodeURIComponent(part.slice(eq + 1).trim());
  }
  return out;
}

/**
 * Builds the `Set-Cookie` value for a session. `Secure` is only set over HTTPS so
 * the cookie still works on `http://localhost` in development. `SameSite=Lax`
 * keeps it off cross-site subrequests, which blocks CSRF on the state-changing
 * endpoints.
 */
export function serializeSessionCookie(token: string, secure: boolean): string {
  const attrs = [
    `${SESSION_COOKIE}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
  ];
  if (secure) attrs.push('Secure');
  return attrs.join('; ');
}

/** Builds the `Set-Cookie` value that clears the session cookie on logout. */
export function serializeClearCookie(secure: boolean): string {
  const attrs = [`${SESSION_COOKIE}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
  if (secure) attrs.push('Secure');
  return attrs.join('; ');
}

// --- Users & sessions (database) ---------------------------------------------

/** Thrown by {@link createUser} when the email is already registered. */
export class EmailTakenError extends Error {
  constructor() {
    super('That email is already registered.');
    this.name = 'EmailTakenError';
  }
}

function requirePool() {
  if (!pool) throw new Error('Auth is not configured (DATABASE_URL is unset).');
  return pool;
}

/** Creates a user with a hashed password. Throws {@link EmailTakenError} on a dup. */
export async function createUser(email: string, password: string): Promise<AuthUser> {
  const db = requirePool();
  const id = randomUUID();
  const passwordHash = await hashPassword(password);
  try {
    await db.query('INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3)', [
      id,
      email,
      passwordHash,
    ]);
  } catch (e) {
    // 23505 = unique_violation (email already exists).
    if (e && typeof e === 'object' && 'code' in e && e.code === '23505') {
      throw new EmailTakenError();
    }
    throw e;
  }
  // A brand-new row always matches the columns' own defaults ('free', 0), so
  // there's no need to round-trip the database again just to read them back.
  return { id, email, plan: 'free', aiGenerationsUsed: 0 };
}

/** Returns the user if the email/password match, otherwise null. */
export async function authenticate(email: string, password: string): Promise<AuthUser | null> {
  const db = requirePool();
  const res = await db.query(
    'SELECT id, email, password_hash, plan, ai_generations_used FROM users WHERE email = $1',
    [email],
  );
  const row = res.rows[0] as
    | { id: string; email: string; password_hash: string; plan: Plan; ai_generations_used: number }
    | undefined;
  if (!row) {
    // Hash a throwaway password so a missing user and a wrong password take about
    // the same time (doesn't leak which emails exist via response timing).
    await hashPassword(password);
    return null;
  }
  if (!(await verifyPassword(password, row.password_hash))) return null;
  return { id: row.id, email: row.email, plan: row.plan, aiGenerationsUsed: row.ai_generations_used };
}

/** Issues a new session for a user and returns its opaque token. */
export async function createSession(userId: string): Promise<string> {
  const db = requirePool();
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.query('INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, $3)', [
    token,
    userId,
    expiresAt,
  ]);
  return token;
}

/** Resolves the user for a session token, or null if it's unknown or expired. */
export async function getSessionUser(token: string | undefined): Promise<AuthUser | null> {
  if (!token || !pool) return null;
  const res = await pool.query(
    `SELECT u.id, u.email, u.plan, u.ai_generations_used, s.expires_at
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.id = $1`,
    [token],
  );
  const row = res.rows[0] as
    | { id: string; email: string; plan: Plan; ai_generations_used: number; expires_at: Date }
    | undefined;
  if (!row) return null;
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    await deleteSession(token);
    return null;
  }
  return { id: row.id, email: row.email, plan: row.plan, aiGenerationsUsed: row.ai_generations_used };
}

/** Deletes a session (logout / expiry cleanup). Safe to call with any token. */
export async function deleteSession(token: string | undefined): Promise<void> {
  if (!token || !pool) return;
  await pool.query('DELETE FROM sessions WHERE id = $1', [token]);
}

/**
 * Records one successful AI furnishing generation against the account (the
 * lifetime counter server/index.ts's free-tier cap reads). Only called after a
 * generation actually finishes, so a failed or cancelled run never costs the
 * user one of their free generations.
 */
export async function incrementAiGenerations(userId: string): Promise<void> {
  const db = requirePool();
  await db.query('UPDATE users SET ai_generations_used = ai_generations_used + 1 WHERE id = $1', [
    userId,
  ]);
}
