import type { IncomingMessage } from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import { isSameOrigin } from './origin.ts';

/** Minimal fake request — `isSameOrigin` only ever reads `req.headers`. */
function req(headers: Record<string, string | undefined>): IncomingMessage {
  return { headers } as unknown as IncomingMessage;
}

describe('isSameOrigin', () => {
  afterEach(() => {
    delete process.env.APP_ORIGIN;
  });

  it('allows a request with no Origin header (non-browser clients)', () => {
    expect(isSameOrigin(req({ host: 'roomcraft.example.com' }))).toBe(true);
  });

  it('allows a real same-origin request (Origin host equals Host header)', () => {
    expect(
      isSameOrigin(req({ origin: 'https://roomcraft.example.com', host: 'roomcraft.example.com' })),
    ).toBe(true);
  });

  it('allows a request proxied through the documented `npm run dev` Vite setup', () => {
    // Browser's real page origin is Vite's dev server (localhost:5173); the proxied
    // request that reaches this server has Host rewritten to the backend it targets
    // (localhost:8787), per `vite.config.ts`'s `proxy: { '/api': 'http://localhost:8787' }`.
    expect(isSameOrigin(req({ origin: 'http://localhost:5173', host: 'localhost:8787' }))).toBe(
      true,
    );
  });

  it('allows the loopback proxy case over 127.0.0.1 too', () => {
    expect(
      isSameOrigin(req({ origin: 'http://127.0.0.1:5173', host: '127.0.0.1:8787' })),
    ).toBe(true);
  });

  it('rejects a genuinely foreign Origin', () => {
    expect(
      isSameOrigin(req({ origin: 'https://evil.example.com', host: 'roomcraft.example.com' })),
    ).toBe(false);
  });

  it('rejects a foreign Origin even when it happens to be loopback but Host is not', () => {
    // Guards against loopback trust leaking into production: a real deployment's Host
    // is its public domain, so a spoofed `Origin: http://localhost` must still fail.
    expect(isSameOrigin(req({ origin: 'http://localhost:1234', host: 'roomcraft.example.com' }))).toBe(
      false,
    );
  });

  it('rejects a malformed Origin header', () => {
    expect(isSameOrigin(req({ origin: 'not-a-url', host: 'roomcraft.example.com' }))).toBe(false);
  });

  it('trusts an explicit APP_ORIGIN allow-list entry', () => {
    process.env.APP_ORIGIN = 'https://staging.roomcraft.example.com, https://roomcraft.app';
    expect(
      isSameOrigin(
        req({ origin: 'https://staging.roomcraft.example.com', host: 'internal-proxy:8787' }),
      ),
    ).toBe(true);
  });

  it('still rejects an Origin not on the APP_ORIGIN allow-list', () => {
    process.env.APP_ORIGIN = 'https://roomcraft.app';
    expect(
      isSameOrigin(req({ origin: 'https://evil.example.com', host: 'internal-proxy:8787' })),
    ).toBe(false);
  });
});
