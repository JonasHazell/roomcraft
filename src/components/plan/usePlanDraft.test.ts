import { describe, expect, it } from 'vitest';
import type { Point } from '../../types';
import { reducer, type DraftState } from './usePlanDraft';

const p = (x: number, z: number): Point => ({ x, z });

function drawing(tool: DraftState['tool'] = 'exterior'): DraftState {
  return {
    tool,
    draft: [],
    redo: [],
    hover: null,
    guide: null,
    closable: false,
    selectedEdge: null,
    error: null,
  };
}

/** Places a run of points, returning the resulting state. */
function place(state: DraftState, ...points: Point[]): DraftState {
  return points.reduce((s, point) => reducer(s, { type: 'place', point }), state);
}

describe('plan draft reducer — drawing undo/redo', () => {
  it('undo removes the last placed point and redo restores it', () => {
    let s = place(drawing(), p(0, 0), p(2, 0), p(2, 2));
    expect(s.draft).toEqual([p(0, 0), p(2, 0), p(2, 2)]);

    s = reducer(s, { type: 'undo' });
    expect(s.draft).toEqual([p(0, 0), p(2, 0)]);
    expect(s.redo).toEqual([p(2, 2)]);

    s = reducer(s, { type: 'redo' });
    expect(s.draft).toEqual([p(0, 0), p(2, 0), p(2, 2)]);
    expect(s.redo).toEqual([]);
  });

  it('undoes down to empty and back up in order', () => {
    let s = place(drawing(), p(0, 0), p(2, 0), p(2, 2));
    s = reducer(s, { type: 'undo' });
    s = reducer(s, { type: 'undo' });
    s = reducer(s, { type: 'undo' });
    expect(s.draft).toEqual([]);
    // A further undo is a no-op, not a crash.
    expect(reducer(s, { type: 'undo' })).toBe(s);

    s = reducer(s, { type: 'redo' });
    s = reducer(s, { type: 'redo' });
    expect(s.draft).toEqual([p(0, 0), p(2, 0)]);
  });

  it('placing a fresh point after undo drops the redo trail', () => {
    let s = place(drawing(), p(0, 0), p(2, 0), p(2, 2));
    s = reducer(s, { type: 'undo' });
    expect(s.redo).toEqual([p(2, 2)]);

    s = reducer(s, { type: 'place', point: p(0, 2) });
    expect(s.draft).toEqual([p(0, 0), p(2, 0), p(0, 2)]);
    expect(s.redo).toEqual([]);
    // Nothing to redo now that the branch changed.
    expect(reducer(s, { type: 'redo' }).draft).toEqual(s.draft);
  });

  it('clears the redo trail when the tool changes or a draw is cancelled', () => {
    let s = place(drawing(), p(0, 0), p(2, 0));
    s = reducer(s, { type: 'undo' });
    expect(s.redo.length).toBe(1);

    const switched = reducer(s, { type: 'setTool', tool: 'interior' });
    expect(switched.draft).toEqual([]);
    expect(switched.redo).toEqual([]);

    const cancelled = reducer(s, { type: 'cancel' });
    expect(cancelled.redo).toEqual([]);
  });
});

describe('plan draft reducer — editing a drawn edge mid-draw', () => {
  it('selects only a real edge (two consecutive placed points)', () => {
    let s = place(drawing(), p(0, 0), p(2, 0), p(2, 2));
    s = reducer(s, { type: 'selectEdge', index: 1 });
    expect(s.selectedEdge).toBe(1);

    // The last point has no following point, so it is not an edge.
    expect(reducer(s, { type: 'selectEdge', index: 2 }).selectedEdge).toBeNull();
    expect(reducer(s, { type: 'selectEdge', index: -1 }).selectedEdge).toBeNull();
    expect(reducer(s, { type: 'selectEdge', index: null }).selectedEdge).toBeNull();
  });

  it('resizing an edge moves its far endpoint and shifts every later point rigidly', () => {
    // Two edges: (0,0)->(2,0) horizontal, (2,0)->(2,2) vertical.
    let s = place(drawing(), p(0, 0), p(2, 0), p(2, 2));
    // Grow the first edge from 2 m to 3 m: its end and the trailing point slide +x by 1.
    s = reducer(s, { type: 'resizeEdge', index: 0, length: 3 });
    expect(s.draft).toEqual([p(0, 0), p(3, 0), p(3, 2)]);
  });

  it('resizing a middle edge keeps the shape of the edges after it', () => {
    let s = place(drawing(), p(0, 0), p(0, 2), p(2, 2), p(2, 4));
    // Shorten the middle horizontal edge (0,2)->(2,2) to 1 m: later points shift −x by 1.
    s = reducer(s, { type: 'resizeEdge', index: 1, length: 1 });
    expect(s.draft).toEqual([p(0, 0), p(0, 2), p(1, 2), p(1, 4)]);
  });

  it('ignores an out-of-range index or a non-positive length', () => {
    const s = place(drawing(), p(0, 0), p(2, 0), p(2, 2));
    expect(reducer(s, { type: 'resizeEdge', index: 5, length: 3 }).draft).toEqual(s.draft);
    expect(reducer(s, { type: 'resizeEdge', index: 0, length: 0 }).draft).toEqual(s.draft);
  });

  it('clears the selected edge when a point is placed, undone or redone', () => {
    let s = place(drawing(), p(0, 0), p(2, 0), p(2, 2));
    s = reducer(s, { type: 'selectEdge', index: 0 });
    expect(reducer(s, { type: 'place', point: p(0, 2) }).selectedEdge).toBeNull();
    expect(reducer(s, { type: 'undo' }).selectedEdge).toBeNull();

    const undone = reducer(s, { type: 'undo' });
    expect(reducer(undone, { type: 'redo' }).selectedEdge).toBeNull();
  });
});
