import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';

/**
 * Coverage for #253: placing/editing furniture instantly changes the always-
 * visible score chip, but that chip sits behind the full-height furniture-editing
 * modal with no explanation of what moved it. FurnitureDialog now surfaces the
 * validation findings that reference the piece being edited — right inside the
 * open modal — so cause ("I placed this bed off the wall") and effect ("the score
 * dropped") are visible without closing the modal to open the validation panel.
 *
 * A bed placed at the centre of a small room is never against a wall, so rule
 * ERG-08 ("Headboard against a solid wall") deterministically fires with a
 * single-piece violation naming that bed — the same reliable, AI-free finding
 * used by e2e/validation-select-piece.spec.ts. The "pick -> place -> tweak" flow
 * hands straight off to the edit modal, so the finding is on screen the moment
 * the bed is placed.
 *
 * Runs in both the `desktop` and `mobile` Playwright projects.
 */

const MEDIA_DIR = '.github/pr-media/agent/issue-253-validation-in-modal';

test('the furniture edit modal surfaces validation findings for the edited piece', async ({
  page,
}, testInfo) => {
  test.setTimeout(60000);
  await page.goto('/');

  // Build a small room — a bed at its default (centred) position sits clear of
  // every wall, so ERG-08 always fires.
  await page.getByRole('button', { name: /create a room/i }).click();
  await page.getByRole('button', { name: /small room/i }).click();
  await page.getByRole('button', { name: /furnish this room/i }).click();

  // Add a bed; the pick hands off straight to the edit modal for the new piece.
  await page.getByRole('button', { name: 'Add furniture' }).click();
  await page.getByRole('button', { name: 'Bed', exact: true }).click();

  // We are now in the edit modal (title "Selected furniture", OK in the footer).
  const dialog = page.getByRole('dialog', { name: 'Furniture settings' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'OK', exact: true })).toBeVisible();

  // The finding for THIS bed is surfaced inside the modal — its message text and
  // its severity cue are both present, scoped to the dialog so we prove it is the
  // in-modal surface (not the standalone ValidationPanel, which is closed here).
  const findings = dialog.getByRole('status', { name: /validation findings/i });
  await expect(findings).toBeVisible();
  await expect(findings.getByText(/headboard/i)).toBeVisible();
  await expect(findings.getByText(/no wall support/i)).toBeVisible();
  // The severity cue reused from ValidationPanel is rendered alongside each
  // message (ERG-08 is importance 3). A centred bed can trip more than one
  // finding, so assert the cue is present rather than that it is unique.
  await expect(findings.locator('.severity-3').first()).toBeVisible();

  mkdirSync(MEDIA_DIR, { recursive: true });
  await page.screenshot({
    path: `${MEDIA_DIR}/${testInfo.project.name}-edit-modal-finding.png`,
  });
});
