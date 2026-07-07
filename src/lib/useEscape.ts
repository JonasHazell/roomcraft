import { useEffect } from 'react';

/**
 * Calls `handler` when Escape is pressed while `active`. Replaces the ad-hoc
 * window keydown listeners that several overlays each set up by hand.
 */
export function useEscape(handler: () => void, active = true): void {
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handler();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handler, active]);
}
