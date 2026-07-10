import { beforeEach, describe, expect, it } from 'vitest';
import { useDesignStore } from './useDesignStore';
// Importing the store installs the design-store subscription that auto-validates.
import { useValidationStore } from './useValidationStore';

const design = () => useDesignStore.getState();
const validation = () => useValidationStore.getState();

describe('automatic validation', () => {
  beforeEach(() => {
    design().newProject();
    useValidationStore.setState({ report: null, highlight: null });
  });

  it('re-runs validation automatically whenever the design changes', () => {
    // No manual validate() call — adding furniture bumps the design and the
    // subscription refreshes the report on its own.
    expect(validation().report).toBeNull();

    design().addFurniture('bed');

    const report = validation().report;
    expect(report).not.toBeNull();
    expect(report?.designUpdatedAt).toBe(design().design.updatedAt);
  });

  it('keeps the report current across further edits', () => {
    design().addFurniture('bed');
    const first = validation().report?.designUpdatedAt;

    design().addFurniture('wardrobe');
    const second = validation().report?.designUpdatedAt;

    expect(second).toBe(design().design.updatedAt);
    expect(second).not.toBe(first);
  });

  it('clears any active highlight when the design changes', () => {
    design().addFurniture('bed');
    useValidationStore.getState().setHighlight({ key: 'x', furnitureIds: [], zones: [] });
    expect(validation().highlight).not.toBeNull();

    design().addFurniture('desk');
    expect(validation().highlight).toBeNull();
  });
});
