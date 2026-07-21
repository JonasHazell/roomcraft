import { test, expect, type Page } from '@playwright/test';

/**
 * Coverage for #368: a printable/exportable room summary — floor plan,
 * furniture list, and validation score — so a room can be taken out of the
 * browser (shown to a partner/landlord, a furniture store, or a professional).
 * The trigger is a printer icon in the room top bar, right next to the
 * keyboard-shortcuts icon (same rationale as that control, see
 * e2e/shortcuts-reference.spec.ts: reachable regardless of selection or pointer
 * type, and this row has slack the bottom dock doesn't). Opening it renders
 * `RoomSummary` (a `.modal` variant), not the live, editable `PlanEditor`.
 *
 * Seeds a drawn room with two distinctly-coloured furniture pieces directly
 * into localStorage (schema v5, same approach as lobby-thumbnail-shape.spec.ts)
 * so the test lands straight on the furnish view with real content to check
 * against, rather than driving the full wizard + furniture-placement flow.
 */

const project = {
  schemaVersion: 5,
  name: 'My rooms',
  updatedAt: new Date().toISOString(),
  rooms: [
    {
      id: 'room-1',
      name: 'Summary Room',
      updatedAt: new Date().toISOString(),
      room: { height: 2.4 },
      floorColor: '#c9a878',
      wallColor: '#efe8da',
      floorMaterial: 'matte',
      wallMaterial: 'matte',
      walls: [
        { id: 'w1', kind: 'exterior', a: { x: -2, z: -2.5 }, b: { x: 2, z: -2.5 } },
        { id: 'w2', kind: 'exterior', a: { x: 2, z: -2.5 }, b: { x: 2, z: 2.5 } },
        { id: 'w3', kind: 'exterior', a: { x: 2, z: 2.5 }, b: { x: -2, z: 2.5 } },
        { id: 'w4', kind: 'exterior', a: { x: -2, z: 2.5 }, b: { x: -2, z: -2.5 } },
      ],
      openings: [],
      furniture: [
        {
          id: 'f-bed',
          kind: 'bed',
          name: 'Bed',
          position: { x: 0, z: -1.5 },
          rotationY: 0,
          size: { width: 1.6, depth: 2.0, height: 0.5 },
          elevation: 0,
          color: '#7d8c72',
        },
        {
          id: 'f-chair',
          kind: 'chair',
          name: 'Reading chair',
          position: { x: 1.2, z: 1.5 },
          rotationY: 0,
          size: { width: 0.45, depth: 0.45, height: 0.9 },
          elevation: 0,
          color: '#4a453c',
        },
      ],
      proposals: [
        {
          id: 'p1',
          name: 'Proposal 1',
          // The store loads `design.furniture` from the active proposal's own
          // furniture array (see lib/persistence.ts), not the room-level field
          // above — so the fixture must mirror it here too, same as
          // e2e/autoarrange-feedback.spec.ts's fixture.
          furniture: [
            {
              id: 'f-bed',
              kind: 'bed',
              name: 'Bed',
              position: { x: 0, z: -1.5 },
              rotationY: 0,
              size: { width: 1.6, depth: 2.0, height: 0.5 },
              elevation: 0,
              color: '#7d8c72',
            },
            {
              id: 'f-chair',
              kind: 'chair',
              name: 'Reading chair',
              position: { x: 1.2, z: 1.5 },
              rotationY: 0,
              size: { width: 0.45, depth: 0.45, height: 0.9 },
              elevation: 0,
              color: '#4a453c',
            },
          ],
          floorColor: '#c9a878',
          wallColor: '#efe8da',
          floorMaterial: 'matte',
          wallMaterial: 'matte',
        },
      ],
      activeProposalId: 'p1',
    },
  ],
  activeRoomId: 'room-1',
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript((p) => {
    localStorage.setItem('roomcraft:current', JSON.stringify({ state: { project: p }, version: 5 }));
  }, project);
  await page.goto('/');
});

async function openFurnishView(page: Page) {
  await page.locator('.room-card-main', { hasText: 'Summary Room' }).click();
  await expect(page.getByRole('button', { name: 'Add furniture' })).toBeVisible();
}

test('the room summary lists the room’s actual furniture and score', async ({ page }) => {
  await openFurnishView(page);

  const trigger = page.getByRole('button', { name: 'Print / export room summary' });
  await expect(trigger).toBeVisible();
  await trigger.click();

  const dialog = page.getByRole('dialog', { name: 'Room summary' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Summary Room')).toBeVisible();

  // Furniture count and each real piece (name/kind), not placeholder content.
  await expect(dialog.getByText('Furniture (2)')).toBeVisible();
  const rows = dialog.locator('.room-summary-row');
  await expect(rows).toHaveCount(2);
  await expect(dialog.getByText('Reading chair')).toBeVisible();
  await expect(rows.filter({ hasText: 'Reading chair' }).getByText('Chair', { exact: true })).toBeVisible();
  await expect(rows.filter({ hasText: 'Bed' }).getByText('Bed', { exact: true }).first()).toBeVisible();

  // Each row's colour swatch matches the piece's actual colour.
  const bedSwatch = rows.filter({ hasText: 'Bed' }).locator('.room-summary-swatch');
  const chairSwatch = rows.filter({ hasText: 'Reading chair' }).locator('.room-summary-swatch');
  await expect(bedSwatch).toHaveCSS('background-color', 'rgb(125, 140, 114)'); // #7d8c72
  await expect(chairSwatch).toHaveCSS('background-color', 'rgb(74, 69, 60)'); // #4a453c

  // The plan draws the floor outline plus one footprint per piece.
  await expect(dialog.locator('.room-summary-plan-floor')).toBeVisible();
  await expect(dialog.locator('.room-summary-plan-item')).toHaveCount(2);

  // The validation score section is populated (not the "–" placeholder).
  await expect(dialog.locator('.validation-total')).not.toContainText('–');
});

test('Esc closes the room summary', async ({ page }) => {
  await openFurnishView(page);

  await page.getByRole('button', { name: 'Print / export room summary' }).click();
  const dialog = page.getByRole('dialog', { name: 'Room summary' });
  await expect(dialog).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('printing shows only the summary sheet, hiding the rest of the app', async ({ page }, testInfo) => {
  // The print layout itself is a single, viewport-independent stylesheet check
  // — no need to repeat it in both projects (see AGENT_BUILD.md's quality note).
  test.skip(testInfo.project.name !== 'desktop', 'print layout only needs checking once');

  await openFurnishView(page);
  await page.getByRole('button', { name: 'Print / export room summary' }).click();
  const dialog = page.getByRole('dialog', { name: 'Room summary' });
  await expect(dialog).toBeVisible();

  await page.emulateMedia({ media: 'print' });

  // The summary sheet stays visible and on-screen chrome (the toolbar with the
  // Print/Close buttons, and the room's own top bar underneath the overlay)
  // is hidden by the scoped @media print rules.
  await expect(page.locator('.room-summary-sheet')).toBeVisible();
  await expect(page.locator('.room-summary-toolbar')).toBeHidden();
  await expect(page.locator('.room-topbar')).toBeHidden();
});
