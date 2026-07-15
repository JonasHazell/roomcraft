/**
 * JS-literal mirrors of the brand colour tokens defined in `src/index.css`'s
 * `:root` block. WebGL materials (react-three-fiber's `meshStandardMaterial`,
 * `meshBasicMaterial`, etc.) take literal colour values and can't read CSS
 * custom properties, so a small hand-kept copy of the palette is unavoidable
 * for 3D scene colours.
 *
 * This is the single source for that duplication — every 3D-scene colour
 * literal should import from here rather than declaring its own copy, so a
 * palette change only needs updating in two places (`index.css` and this
 * file) instead of drifting across every consumer independently.
 *
 * Keep these values in sync with `src/index.css` by hand whenever a token
 * changes.
 */

/** Mirrors `--accent` (terracotta). Used for the furniture rotation handle. */
export const ACCENT = '#b4532f';

/** Mirrors `--select` (selection blue). Used for the selected-piece emissive glow. */
export const SELECT = '#2f6fdd';

/**
 * Mirrors `--danger` (error red). Used for the 3D validation overlay that
 * highlights a selected issue's furniture footprints, floor zones, and
 * markers.
 *
 * This used to be a one-off `#d9482b` that had silently drifted from
 * `--danger` (`#dc2626`) — the token it was meant to represent, since both
 * mark the same "error/violation" state. Aligned here so the 2D and 3D views
 * agree on what "danger" looks like, per DESIGN.md's single-source-of-truth
 * rule for colour.
 */
export const DANGER = '#dc2626';
