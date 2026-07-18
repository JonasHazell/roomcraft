import { test, expect, type Page, type Locator } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Coverage for #333: the furniture-editing dialog used to treat an incidental
 * dismiss (backdrop / ✕ / Esc) as "discard everything" — silently rolling back
 * every live edit on an EXISTING piece with no warning. Experimenting is meant
 * to be risk-free (PRINCIPLES.md #7), so this is a footgun on a phone where a
 * stray backdrop tap is easy.
 *
 * The fix branches dismiss on how the edit session started (FurnitureDialog.tsx):
 *  - Editing an EXISTING piece via "More" → dismiss is close-and-KEEP. The live
 *    edits are already in the store and undoable via the global undo, so all
 *    three dismiss paths commit them (matching OK).
 *  - A piece just PLACED from the picker → dismiss still DISCARDS it (a
 *    never-committed new piece should vanish). Unchanged behaviour.
 *
 * One spec, both viewports (see playwright.config.ts): every assertion below is
 * checked in a desktop browser AND on a phone.
 */

const ARTIFACT_DIR = join(process.cwd(), 'e2e-artifacts');

/**
 * Walks the unified plan surface (which replaced the old multi-step wizard, see
 * #342) to a furnished 3D view using a template shape: create → pick a ready
 * shape → furnish.
 */
async function createRoomAndEnterFurnish(page: Page) {
  await page.getByRole('button', { name: /create a room/i }).click();

  // Pick a ready-made shape instead of drawing by hand, then carry the room into
  // the 3D furnish view.
  await page.getByRole('button', { name: /small room/i }).click();
  await page.getByRole('button', { name: /furnish this room/i }).click();
  await expect(page.getByRole('button', { name: 'Add furniture' })).toBeVisible();
}

const editDialog = (page: Page) => page.getByRole('dialog', { name: 'Furniture settings' });

/** Opens the edit dialog for the currently-selected piece via the "More" pill. */
async function openMore(page: Page) {
  await page.getByRole('button', { name: 'More settings' }).click();
  await expect(editDialog(page)).toBeVisible();
}

/**
 * Sets the Width field and commits it (the furniture size fields commit on
 * blur/Enter, and select-on-focus means one edit replaces the whole value —
 * see furniture-size-commit-on-blur.spec.ts).
 */
async function setWidth(page: Page, value: string) {
  const width = page.getByLabel('Width');
  await width.click();
  await width.pressSequentially(value);
  await width.press('Enter');
  await expect(width).toHaveValue(value);
}

/** Clicks the dimmed backdrop above the centred modal (never the modal itself). */
async function dismissViaBackdrop(page: Page) {
  const backdrop = page.locator('.modal-backdrop');
  const box = await backdrop.boundingBox();
  if (!box) throw new Error('no modal backdrop');
  // The modal is vertically centred under an 82vh cap, so the top strip of the
  // full-viewport backdrop is always clear of it in both viewports.
  await backdrop.click({ position: { x: box.width / 2, y: 6 } });
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('editing an existing piece keeps changes when dismissed via backdrop, ✕ or Esc', async ({
  page,
}, testInfo) => {
  // The full flow mounts the lazy 3D scene and drives it; on an emulated touch
  // browser under load this runs well past the default budget.
  test.setTimeout(240_000);

  await createRoomAndEnterFurnish(page);

  // Place a sofa and COMMIT it with OK, so we now have a real, existing piece
  // (this is the create→edit hand-off; OK is the only path that keeps it).
  await page.getByRole('button', { name: 'Add furniture' }).click();
  await page.getByRole('button', { name: 'Sofa', exact: true }).click();
  await expect(editDialog(page)).toBeVisible();
  await page.getByRole('button', { name: 'OK', exact: true }).click();
  await expect(editDialog(page)).toBeHidden();

  // The committed piece stays selected, so its "Furniture actions" bar is shown.
  await expect(page.getByRole('toolbar', { name: 'Furniture actions' })).toBeVisible();

  // --- Backdrop dismiss KEEPS the edit ---
  await openMore(page);
  await setWidth(page, '133');

  // Capture the edit-dialog flow in this viewport before dismissing.
  mkdirSync(ARTIFACT_DIR, { recursive: true });
  await page.screenshot({ path: join(ARTIFACT_DIR, `issue-333-dialog-${testInfo.project.name}.png`) });

  await dismissViaBackdrop(page);
  await expect(editDialog(page)).toBeHidden();
  // Reopen: the change survived the incidental dismiss.
  await openMore(page);
  await expect(page.getByLabel('Width')).toHaveValue('133');

  // --- ✕ (Close) dismiss KEEPS a further edit ---
  await setWidth(page, '144');
  await editDialog(page).getByRole('button', { name: 'Close' }).click();
  await expect(editDialog(page)).toBeHidden();
  await openMore(page);
  await expect(page.getByLabel('Width')).toHaveValue('144');

  // --- Esc dismiss KEEPS a further edit ---
  await setWidth(page, '155');
  await page.keyboard.press('Escape');
  await expect(editDialog(page)).toBeHidden();
  await openMore(page);
  await expect(page.getByLabel('Width')).toHaveValue('155');

  // Close (keeping 155) and prove the whole thing stayed risk-free: a single
  // global Undo reverts the last committed edit (155 → 144). Undo clears the
  // selection, so re-select the sofa from the 3D view to read its width again.
  await editDialog(page).getByRole('button', { name: 'Close' }).click();
  await expect(editDialog(page)).toBeHidden();
  await page.keyboard.press('Control+z');

  const toolbar = page.getByRole('toolbar', { name: 'Furniture actions' });
  await expect(toolbar).toBeHidden();
  await expect(page.locator('.scene-loading')).toBeHidden({ timeout: 90_000 });
  await reselectPiece(page, toolbar);
  await openMore(page);
  await expect(page.getByLabel('Width')).toHaveValue('144');
});

test('a just-placed (new) piece is still discarded when dismissed', async ({ page }) => {
  test.setTimeout(120_000);

  await createRoomAndEnterFurnish(page);

  // Place a sofa but do NOT commit it — this is a fresh, never-committed piece.
  await page.getByRole('button', { name: 'Add furniture' }).click();
  await page.getByRole('button', { name: 'Sofa', exact: true }).click();
  await expect(editDialog(page)).toBeVisible();

  // Dismissing via the backdrop discards it. Were the new piece wrongly KEPT
  // (the edit-mode behaviour), dismissing would leave it selected and its
  // "Furniture actions" bar would appear. Instead the piece vanishes — selection
  // cleared, no actions bar — and we're back to an empty room.
  await dismissViaBackdrop(page);
  await expect(editDialog(page)).toBeHidden();
  await expect(page.getByRole('toolbar', { name: 'Furniture actions' })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Add furniture' })).toBeVisible();
});

// The sofa sits at the room centre (the camera's orbit target), rendering around
// the lower-middle of the canvas — but the exact spot shifts with aspect ratio,
// so probe a small grid rather than hard-code one point (as furniture-click-
// selection.spec.ts does).
const PIECE_CANDIDATES: ReadonlyArray<readonly [number, number]> = [
  [0.5, 0.55],
  [0.54, 0.58],
  [0.5, 0.6],
  [0.46, 0.56],
  [0.58, 0.6],
  [0.5, 0.5],
  [0.54, 0.52],
  [0.5, 0.64],
  [0.6, 0.62],
  [0.44, 0.58],
];

/** Still-clicks candidate points until the piece's actions bar reappears. */
async function reselectPiece(page: Page, toolbar: Locator) {
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  if (!box) throw new Error('no canvas box');
  await expect(async () => {
    for (const [fx, fy] of PIECE_CANDIDATES) {
      await canvas.click({ position: { x: box.width * fx, y: box.height * fy } });
      try {
        await expect(toolbar).toBeVisible({ timeout: 1200 });
        return;
      } catch {
        await page.keyboard.press('Escape');
        await expect(toolbar).toBeHidden({ timeout: 1200 }).catch(() => {});
      }
    }
    throw new Error('no candidate point re-selected the piece');
  }).toPass({ timeout: 60_000 });
}
