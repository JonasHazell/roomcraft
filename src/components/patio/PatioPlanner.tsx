import { lazy, Suspense } from 'react';
import { Icon } from '../ui/Icon';
import { PatioControls } from './PatioControls';

// The 3D scene pulls in three.js; load it lazily so navigating to #patio only
// fetches the heavy bundle when the planner is actually opened (same rationale
// as the main furnishing Scene in App.tsx).
const PatioScene = lazy(() =>
  import('./PatioScene').then((m) => ({ default: m.PatioScene })),
);

/** Leave the patio planner: clearing the hash drops back to the app shell. */
function leave() {
  if (window.location.hash) window.location.hash = '';
}

/**
 * The outdoor patio planner surface, reachable at `#patio`. A standalone 3D
 * sandbox for trying deck (altan) sizes and ground surfaces (paving / gravel)
 * against a house — spin the camera to view any solution from any angle. It is
 * independent of the room model (`useDesignStore`): opening it never touches a
 * user's rooms, the same way the shared-room viewer stays off the local project.
 */
export function PatioPlanner() {
  return (
    <div className="app">
      <main className="viewport patio-view">
        <Suspense fallback={<div className="scene-loading">Laddar 3D-vy…</div>}>
          <PatioScene />
        </Suspense>

        <div className="room-topbar">
          <button
            type="button"
            className="btn room-back"
            onClick={leave}
            title="Tillbaka"
            aria-label="Tillbaka"
          >
            <span aria-hidden="true">
              <Icon name="arrow-left" />
            </span>
            <span className="room-back-label">Tillbaka</span>
          </button>
          <span className="room-topbar-name">Uteplats</span>
        </div>

        <PatioControls />

        <p className="patio-hint">Dra för att snurra · rulla för att zooma</p>
      </main>
    </div>
  );
}
