import { useStorageStatus } from '../store/useStorageStatus';

/**
 * Writes to `localStorage`, catching a `setItem` failure — quota exceeded, or
 * Safari Private Browsing where it throws unconditionally — instead of letting
 * it propagate out of the caller (a store mutation, a library save) and crash
 * to the app-wide error boundary. The edit that triggered the write stays in
 * memory either way; this only guards whether it also reaches disk, and flags
 * the outcome via `useStorageStatus` so the UI can show an honest notice
 * instead of a silent failure or a crash.
 */
export function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
    useStorageStatus.getState().setSaveFailed(false);
  } catch (err) {
    console.error(`Failed to save "${key}" to localStorage:`, err);
    useStorageStatus.getState().setSaveFailed(true);
  }
}
