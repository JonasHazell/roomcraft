import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { safeSetItem } from './safeStorage';
import { useStorageStatus } from '../store/useStorageStatus';

/** A minimal localStorage stand-in, since this test suite runs under Node
 * (no jsdom), which has no `localStorage` global at all. */
function createMockStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
  };
}

describe('safeSetItem', () => {
  beforeEach(() => {
    useStorageStatus.setState({ saveFailed: false });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('writes through to localStorage and leaves saveFailed false on success', () => {
    const storage = createMockStorage();
    vi.stubGlobal('localStorage', storage);

    safeSetItem('k', 'v');

    expect(storage.getItem('k')).toBe('v');
    expect(useStorageStatus.getState().saveFailed).toBe(false);
  });

  it('does not throw when setItem fails (quota exceeded / private browsing), and flags it', () => {
    const storage = createMockStorage();
    vi.spyOn(storage, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    vi.stubGlobal('localStorage', storage);

    expect(() => safeSetItem('k', 'v')).not.toThrow();
    expect(useStorageStatus.getState().saveFailed).toBe(true);
  });

  it('clears a prior failure once a write succeeds again', () => {
    const storage = createMockStorage();
    const spy = vi.spyOn(storage, 'setItem').mockImplementationOnce(() => {
      throw new Error('QuotaExceededError');
    });
    vi.stubGlobal('localStorage', storage);

    safeSetItem('k', 'v');
    expect(useStorageStatus.getState().saveFailed).toBe(true);

    spy.mockRestore();
    safeSetItem('k', 'v2');
    expect(useStorageStatus.getState().saveFailed).toBe(false);
  });
});
