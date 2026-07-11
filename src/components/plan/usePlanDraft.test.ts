import { describe, expect, it } from 'vitest';
import type { Point } from '../../types';
import { reducer, type DraftState } from './usePlanDraft';

const p = (x: number, z: number): Point => ({ x, z });

function drawing(tool: DraftState['tool'] = 'exterior'): DraftState {
  return { tool, draft: [], redo: [], hover: null, guide: null, closable: false, error: null };
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
