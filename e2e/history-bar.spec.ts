import { test, expect, type Page } from '@playwright/test';

/**
 * Coverage for the undo/redo pill (`HistoryBar`, src/components/panel/HistoryBar.tsx)
 * rebuilt on the shared `SelBar`/`SelBarButton` primitives in
 * src/components/panel/SelBar.tsx (#205) instead of hand-written markup. The
 * refactor is meant to be behaviourally invisible, so this spec drives the real
 * undo/redo flow — including the disabled state that used to be a one-off
 * `disabled` prop on a raw `<button>` and now flows through `SelBarButton` — to
 * confirm nothing regressed.
 *
 * Runs in both the `desktop` and `mobile` projects (see playwright.config.ts).
 */

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

/** How many furniture pieces are in the active room's active proposal, read
 *  straight from the persisted project (`useDesignStore`'s zustand `persist`
 *  writes to this key on every change). Undo/redo both clear the current
 *  selection (see `applySnapshot` in useHistoryStore.ts), so a selection-based
 *  DOM signal (e.g. the "Duplicate" button) can't tell a restored piece from a
 *  removed one — reading the persisted furniture count sidesteps that. */
async function furnitureCount(page: Page): Promise<number> {
  return page.evaluate(() => {
    const raw = localStorage.getItem('roomcraft:current');
    if (!raw) return -1;
    const project = JSON.parse(raw).state.project;
    const room = project.rooms.find((r: { id: string }) => r.id === project.activeRoomId);
    const proposal = room.proposals.find(
      (p: { id: string }) => p.id === room.activeProposalId,
    );
    return proposal.furniture.length;
  });
}

test('undo/redo pill starts disabled, enables after an edit, and round-trips the edit', async ({
  page,
}) => {
  test.setTimeout(90_000);

  // Build a room from a template — quicker and more robust than drawing an
  // outline by hand (same technique as e2e/furniture-collision.spec.ts).
  await page.getByRole('button', { name: /create a room/i }).click();
  await page.getByLabel(/room name/i).fill('History test room');
  await page.getByRole('button', { name: /^next/i }).click();
  await page.getByRole('button', { name: /small room/i }).click();
  await page.getByRole('button', { name: /^next/i }).click();
  await page.getByRole('button', { name: /create room/i }).click();
  await expect(page.getByRole('button', { name: 'Add furniture' })).toBeVisible();

  const history = page.getByRole('toolbar', { name: 'History' });
  await expect(history).toBeVisible();
  const undo = history.getByRole('button', { name: 'Undo' });
  const redo = history.getByRole('button', { name: 'Redo' });

  // Nothing to undo/redo in a freshly-created room.
  await expect(undo).toBeDisabled();
  await expect(redo).toBeDisabled();
  expect(await furnitureCount(page)).toBe(0);

  // Add a chair and commit it — the "pick -> place -> tweak" flow described in
  // FurnitureDialog is batched as a single undo step.
  await page.getByRole('button', { name: /add furniture/i }).click();
  await page.getByRole('button', { name: 'Chair', exact: true }).click();
  await page.getByRole('button', { name: 'OK', exact: true }).click();
  await expect.poll(() => furnitureCount(page), { timeout: 15_000 }).toBe(1);

  // The placement is now undoable; nothing to redo yet.
  await expect(undo).toBeEnabled();
  await expect(redo).toBeDisabled();

  await undo.click();
  await expect.poll(() => furnitureCount(page), { timeout: 15_000 }).toBe(0);
  await expect(undo).toBeDisabled();
  await expect(redo).toBeEnabled();

  await redo.click();
  await expect.poll(() => furnitureCount(page), { timeout: 15_000 }).toBe(1);
  await expect(undo).toBeEnabled();
  await expect(redo).toBeDisabled();
});
