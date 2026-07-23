import { test, expect } from '@playwright/test';

/**
 * #422: a door/window's height + elevation are always clamped to the room's
 * ceiling height (`clampOpening`), but a furniture piece's weren't — it was
 * possible to resize a piece's Height (or raise its "Height above floor") well
 * past the ceiling with nothing warning, clamping, or flagging it.
 * `clampFurniture` now gives furniture the same guarantee, applied wherever its
 * geometry is committed (the field here, drag/resize, and placement).
 *
 * The fix clamps silently — matching openings' existing UX — rather than
 * rejecting the edit outright, so this asserts the field settles on the
 * clamped value instead of either the raw typed value or being left unchanged.
 */
test('resizing a piece taller than the room clamps its height to the ceiling instead of accepting it unbounded', async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.goto('/');

  await page.getByRole('button', { name: /create a room/i }).click();
  await page.getByRole('button', { name: /^bedroom/i }).click();
  await page.getByRole('button', { name: /furnish this room/i }).click();

  await page.getByRole('button', { name: 'Add furniture' }).click();
  await page.getByRole('button', { name: 'Sofa', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Furniture settings' })).toBeVisible();

  const height = page.getByLabel('Height', { exact: true }); // declared min={2} max={600} in FurnitureFields.tsx
  const elevation = page.getByLabel('Height above floor');
  await expect(elevation).toHaveValue('0'); // sofa starts standing on the floor

  // 600cm is within the field's own declared max, but well over the room's
  // default 250cm (2.5m) ceiling — the store-level ceiling clamp must catch
  // what the field's own min/max can't.
  await height.click();
  await height.pressSequentially('600');
  await height.press('Enter');

  // Clamped to the ceiling, not left at the raw 600 and not rejected back to
  // the original value.
  await expect(height).toHaveValue('250');
  await expect(elevation).toHaveValue('0'); // elevation untouched — only height gave way
});

test('raising a piece above the ceiling clamps elevation so the piece stays within the room', async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.goto('/');

  await page.getByRole('button', { name: /create a room/i }).click();
  await page.getByRole('button', { name: /^bedroom/i }).click();
  await page.getByRole('button', { name: /furnish this room/i }).click();

  await page.getByRole('button', { name: 'Add furniture' }).click();
  await page.getByRole('button', { name: 'Mirror', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Furniture settings' })).toBeVisible();

  const elevation = page.getByLabel('Height above floor');

  // Mount it near the very top of a 250cm ceiling — comfortably over the
  // room's height on its own, even before its own size is added on top.
  await elevation.click();
  await elevation.pressSequentially('300');
  await elevation.press('Enter');

  const value = Number(await elevation.inputValue());
  expect(value).toBeLessThan(250); // clamped below the ceiling, not left at 300
});
