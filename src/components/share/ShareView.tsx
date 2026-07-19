import { lazy, Suspense, useEffect, useState } from 'react';
import type { Design } from '../../types';
import { apiGetShare } from '../../lib/shareApi';
import { Icon } from '../ui/Icon';

// Same lazy-loading rationale as App.tsx's FurnishView: three.js and the scene
// are the bulk of the bundle, so fetch that chunk only once a share is actually
// being viewed.
const ShareScene = lazy(() =>
  import('./ShareScene').then((m) => ({ default: m.ShareScene })),
);

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; design: Design }
  | { status: 'error'; message: string };

/**
 * The read-only surface for a shared room link (#353), reached at `#share/:id`
 * (see `App.tsx`'s hash routing). Fetches the point-in-time snapshot and shows
 * it with `ShareScene` — no dock, no side panel, no selection, nothing editable
 * — with a `.card` label that always makes clear this is someone else's shared
 * room, not the visitor's own workspace (never a blank, unexplained page).
 */
export function ShareView({ id }: { id: string }) {
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    apiGetShare(id)
      .then((design) => {
        if (!cancelled) setState({ status: 'ready', design });
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setState({
            status: 'error',
            message: e instanceof Error ? e.message : 'Could not load this shared room.',
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (state.status === 'loading') {
    return (
      <div className="error-screen">
        <div className="error-screen-card card">
          <p className="hint">Loading the shared room…</p>
        </div>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="error-screen" role="alert">
        <div className="error-screen-card card">
          <h1>This link isn&rsquo;t working</h1>
          <p className="error">{state.message}</p>
        </div>
      </div>
    );
  }

  return (
    <main className="viewport">
      <Suspense fallback={<div className="scene-loading">Loading 3D view…</div>}>
        <ShareScene design={state.design} />
      </Suspense>
      <div className="share-badge card">
        <Icon name="share" />
        <span>This is a shared view of a RoomCraft room — &ldquo;{state.design.name}&rdquo;.</span>
      </div>
    </main>
  );
}
