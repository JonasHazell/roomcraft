import { test, expect, type Page } from '@playwright/test';
import { join } from 'node:path';

/**
 * Coverage for #205: the undo/redo `HistoryBar` pill was rebuilt on the shared
 * `SelBar`/`SelBarButton` primitives (like its sibling dock pills) instead of
 * hand-writing the markup. This is a structural refactor with no intended visual
 * or behavioural change, so this spec drives the REAL undo/redo flow to prove the
 * pill still works: it starts disabled, enables after an edit, and round-trips an
 * add-furniture step forward and back.
 *
 * It runs in both the `desktop` and `mobile` projects (see playwright.config.ts),
 * so the dock pill is validated in both viewports.
 *
 * Note: `applySnapshot` (useHistoryStore) clears the selection on both undo AND
 * redo, so a selection-based DOM signal can't tell us whether the piece survived.
 * We instead assert on the PERSISTED furniture count read straight from the
 * `roomcraft:current` localStorage blob, which reflects the document itself.
 */

async function createLivingRoom(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: /create a room/i }).click();

  // Pick a ready-made shape instead of drawing by hand.
  await page.getByRole('button', { name: /living room/i }).click();

  // Head into the furnish view.
  await page.getByRole('button', { name: /furnish this room/i }).click();
  await expect(page.getByRole('toolbar', { name: 'Room actions' })).toBeVisible();
}

/**
 * The number of placed furniture pieces in the persisted document. Each room
 * (a `Design`, see src/types.ts) carries BOTH its live `furniture` array and a
 * `proposals[]` list whose active entry mirrors those same pieces — so a piece
 * lives in the blob twice. We count a room's live `furniture` once (matching the
 * on-screen document) and never descend into its proposals, so a single added
 * chair reads as 1, not 2.
 */
async function furnitureCount(page: Page): Promise<number> {
  return page.evaluate(() => {
    const raw = localStorage.getItem('roomcraft:current');
    if (!raw) return 0;
    let n = 0;
    const walk = (v: unknown): void => {
      if (Array.isArray(v)) {
        v.forEach(walk);
        return;
      }
      if (v && typeof v === 'object') {
        const o = v as Record<string, unknown>;
        // A room object has both `furniture` and `proposals`; count its live
        // furniture and stop so the mirrored proposal copies aren't re-counted.
        if (Array.isArray(o.furniture) && Array.isArray(o.proposals)) {
          n += o.furniture.length;
          return;
        }
        Object.values(o).forEach(walk);
      }
    };
    walk(JSON.parse(raw));
    return n;
  });
}

test('the history pill starts disabled, enables on an edit, and round-trips undo/redo', async ({
  page,
}, testInfo) => {
  // The 3D WebGL scene plus canvas interactions can run close to the default 30s
  // budget on the emulated mobile browser; give this some headroom.
  test.setTimeout(60_000);

  await createLivingRoom(page);

  const history = page.getByRole('toolbar', { name: 'History' });
  const undo = history.getByRole('button', { name: 'Undo' });
  const redo = history.getByRole('button', { name: 'Redo' });

  // The pill renders in the furnish dock, icon-only, with both actions disabled
  // because there is nothing to undo or redo yet.
  await expect(history).toBeVisible();
  await expect(undo).toBeDisabled();
  await expect(redo).toBeDisabled();
  expect(await furnitureCount(page)).toBe(0);

  // Capture the dock (with the undo/redo pill) for the PR — one shot per project
  // gives us the desktop and mobile images pr-media needs.
  await page.screenshot({
    path: join('test-results', `history-dock-${testInfo.project.name}.png`),
  });

  // Add a chair and commit it as one undo step (pick -> OK; see FurnitureDialog,
  // which batches the placement + edits into a single step).
  await page.getByRole('button', { name: /add furniture/i }).click();
  await page.getByRole('button', { name: 'Chair', exact: true }).click();
  await expect(page.getByLabel('Width')).toBeVisible();
  await page.getByRole('button', { name: 'OK', exact: true }).click();

  // One piece is now in the document, and Undo is live (Redo still has nothing).
  await expect.poll(() => furnitureCount(page)).toBe(1);
  await expect(undo).toBeEnabled();
  await expect(redo).toBeDisabled();

  // Undo removes the piece and, in turn, arms Redo.
  await undo.click();
  await expect.poll(() => furnitureCount(page)).toBe(0);
  await expect(redo).toBeEnabled();

  // Redo puts it back — a clean round-trip through the rebuilt pill.
  await redo.click();
  await expect.poll(() => furnitureCount(page)).toBe(1);
  await expect(undo).toBeEnabled();
});
