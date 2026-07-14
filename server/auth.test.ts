import { describe, expect, it } from 'vitest';
import {
  SESSION_COOKIE,
  hashPassword,
  isValidPassword,
  normalizeEmail,
  parseCookies,
  serializeClearCookie,
  serializeSessionCookie,
  verifyPassword,
} from './auth.ts';

describe('password hashing', () => {
  it('verifies the correct password and rejects a wrong one', async () => {
    const hash = await hashPassword('correct horse battery');
    expect(hash.startsWith('scrypt$')).toBe(true);
    expect(await verifyPassword('correct horse battery', hash)).toBe(true);
    expect(await verifyPassword('wrong password', hash)).toBe(false);
  });

  it('produces a different hash each time (random salt)', async () => {
    const a = await hashPassword('same-password');
    const b = await hashPassword('same-password');
    expect(a).not.toBe(b);
    expect(await verifyPassword('same-password', a)).toBe(true);
    expect(await verifyPassword('same-password', b)).toBe(true);
  });

  it('rejects a malformed stored hash instead of throwing', async () => {
    expect(await verifyPassword('x', 'not-a-hash')).toBe(false);
    expect(await verifyPassword('x', 'scrypt$onlyonepart')).toBe(false);
  });
});

describe('normalizeEmail', () => {
  it('trims and lower-cases valid addresses', () => {
    expect(normalizeEmail('  User@Example.COM ')).toBe('user@example.com');
  });

  it('rejects invalid or non-string input', () => {
    expect(normalizeEmail('not-an-email')).toBeNull();
    expect(normalizeEmail('a@b')).toBeNull();
    expect(normalizeEmail('')).toBeNull();
    expect(normalizeEmail(42)).toBeNull();
  });
});

describe('isValidPassword', () => {
  it('enforces a minimum length', () => {
    expect(isValidPassword('short')).toBe(false);
    expect(isValidPassword('longenough')).toBe(true);
    expect(isValidPassword(12345678)).toBe(false);
  });
});

describe('cookies', () => {
  it('parses a Cookie header into a map', () => {
    const cookies = parseCookies(`${SESSION_COOKIE}=abc123; other=val`);
    expect(cookies[SESSION_COOKIE]).toBe('abc123');
    expect(cookies.other).toBe('val');
  });

  it('returns an empty map for no header', () => {
    expect(parseCookies(undefined)).toEqual({});
  });

  it('marks the session cookie HttpOnly and only Secure over HTTPS', () => {
    const secure = serializeSessionCookie('tok', true);
    expect(secure).toContain(`${SESSION_COOKIE}=tok`);
    expect(secure).toContain('HttpOnly');
    expect(secure).toContain('SameSite=Lax');
    expect(secure).toContain('Secure');

    const insecure = serializeSessionCookie('tok', false);
    expect(insecure).not.toContain('Secure');
  });

  it('clears the cookie with Max-Age=0', () => {
    expect(serializeClearCookie(false)).toContain('Max-Age=0');
  });
});
