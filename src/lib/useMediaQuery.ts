import { useSyncExternalStore } from 'react';

/**
 * Subscribes to a CSS media query and re-renders when it changes.
 * SSR-safe: the server snapshot reports `false`.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** True on touch-first devices (phones, tablets), used to tune hit areas and hints. */
export const COARSE_POINTER = '(pointer: coarse)';
/** Mobile-width breakpoint; matches the CSS drawer breakpoint. */
export const MOBILE_WIDTH = '(max-width: 768px)';
