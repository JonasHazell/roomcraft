import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDesignStore } from './useDesignStore';
// Importing the store installs the design-store subscription that auto-validates.
import { useValidationStore } from './useValidationStore';

const design = () => useDesignStore.getState();
const validation = () => useValidationStore.getState();

describe('automatic validation', () => {
  // Edits stamp `design.updatedAt` from the wall clock, so back-to-back edits
  // in the same millisecond would otherwise share a timestamp and make the
  // "further edits" assertion flaky. Fake timers give each edit a distinct,
  // deterministic stamp.
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    design().newProject();
    useValidationStore.setState({ report: null, highlight: null });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('re-runs validation automatically whenever the design changes', () => {
    // No manual validate() call — adding furniture bumps the design and the
    // subscription refreshes the report on its own.
    expect(validation().report).toBeNull();

    vi.advanceTimersByTime(1);
    design().addFurniture('bed');

    const report = validation().report;
    expect(report).not.toBeNull();
    expect(report?.designUpdatedAt).toBe(design().design.updatedAt);
  });

  it('keeps the report current across further edits', () => {
    vi.advanceTimersByTime(1);
    design().addFurniture('bed');
    const first = validation().report?.designUpdatedAt;

    vi.advanceTimersByTime(1);
    design().addFurniture('wardrobe');
    const second = validation().report?.designUpdatedAt;

    expect(second).toBe(design().design.updatedAt);
    expect(second).not.toBe(first);
  });

  it('clears any active highlight when the design changes', () => {
    vi.advanceTimersByTime(1);
    design().addFurniture('bed');
    useValidationStore.getState().setHighlight({ key: 'x', furnitureIds: [], zones: [] });
    expect(validation().highlight).not.toBeNull();

    vi.advanceTimersByTime(1);
    design().addFurniture('desk');
    expect(validation().highlight).toBeNull();
  });
});
