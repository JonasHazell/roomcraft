import { test, expect, type Page } from '@playwright/test';

/**
 * Coverage for #227: a persistently reachable keyboard-shortcuts reference for
 * the furnish view. Before this, the only in-app shortcut list was a hint line in
 * PropertiesPanel that (a) only showed once a piece was already selected and (b)
 * was hidden entirely on touch devices (`{!coarse && …}`), and it omitted
 * undo/redo entirely. The fix: a keyboard icon in the room top bar (always
 * present, regardless of pointer type or selection — see App.tsx, next to the
 * back-to-lobby button) opens `ShortcutsReference`, a `.modal-sm` listing every
 * binding from `lib/globalKeydown.ts`.
 *
 * The trigger deliberately does NOT live in the bottom dock's ActionBar: at the
 * narrow end of the supported range that pill and the standalone undo/redo pill
 * already consume their whole share of the dock's grid with nothing spare (see
 * ActionBar.tsx and e2e/bottom-dock.spec.ts, the #170 regression coverage), so a
 * second icon there would silently reopen that overlap. The room top bar has
 * real slack on both sides of the centred proposal switcher instead.
 *
 * This spec seeds a minimal already-drawn room directly into localStorage (the
 * same fixture shape `touch-target.spec.ts` uses) so it lands straight on the
 * furnish view without driving the New room flow — the trigger renders
 * unconditionally there, with nothing selected, which is exactly the "hidden
 * hint" gap this issue closes.
 *
 * Runs in both the `desktop` and `mobile` Playwright projects (see
 * playwright.config.ts) — the `mobile` project emulates a touch device (Pixel 5,
 * `hasTouch: true`), which is what used to make the old hint disappear via its
 * `(pointer: coarse)` media query, so that gap is covered simply by this spec
 * running unchanged in both projects.
 */

const project = {
  schemaVersion: 5,
  name: 'My rooms',
  updatedAt: new Date().toISOString(),
  rooms: [
    {
      id: 'room-1',
      name: 'Shortcuts Room',
      updatedAt: new Date().toISOString(),
      room: { height: 2.5 },
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
      furniture: [],
      proposals: [
        {
          id: 'p1',
          name: 'Proposal 1',
          furniture: [],
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

/** Opens the seeded room from the lobby, landing on the furnish view's dock with
 *  nothing selected. */
async function openFurnishView(page: Page) {
  await page.locator('.room-card-main', { hasText: 'Shortcuts Room' }).click();
  await expect(page.getByRole('button', { name: 'Add furniture' })).toBeVisible();
}

test('the shortcuts reference is reachable with nothing selected and lists every binding', async ({
  page,
}) => {
  await openFurnishView(page);

  const trigger = page.getByRole('button', { name: 'Keyboard shortcuts' });
  await expect(trigger).toBeVisible();
  await trigger.click();

  const dialog = page.getByRole('dialog', { name: 'Shortcuts and gestures' });
  await expect(dialog).toBeVisible();

  // Every binding wired up in globalKeydown.ts, including undo/redo — which the
  // old PropertiesPanel hint omitted entirely.
  await expect(dialog.getByText('Undo', { exact: true })).toBeVisible();
  await expect(dialog.getByText('Redo', { exact: true })).toBeVisible();
  await expect(dialog.getByText(/rotate selected piece right/i)).toBeVisible();
  await expect(dialog.getByText(/rotate selected piece left/i)).toBeVisible();
  await expect(dialog.getByText(/duplicate selected piece/i)).toBeVisible();
  await expect(dialog.getByText(/delete selected piece or wall/i)).toBeVisible();
  await expect(dialog.getByText(/deselect/i)).toBeVisible();

  // The actual key chips for a couple of representative rows.
  await expect(dialog.locator('kbd.key', { hasText: 'Z' }).first()).toBeVisible();
  await expect(dialog.locator('kbd.key', { hasText: 'Esc' })).toBeVisible();
});

test('the reference also lists the touch/pointer gestures (#292)', async ({ page }, testInfo) => {
  await openFurnishView(page);

  await page.getByRole('button', { name: 'Keyboard shortcuts' }).click();
  const dialog = page.getByRole('dialog', { name: 'Shortcuts and gestures' });
  await expect(dialog).toBeVisible();

  // The gesture rows a touch user can actually act on — the only way to do most
  // of these on a phone.
  await expect(dialog.getByText('Orbit the view', { exact: true })).toBeVisible();
  await expect(dialog.getByText('Zoom', { exact: true })).toBeVisible();
  await expect(dialog.getByText('Move a piece', { exact: true })).toBeVisible();
  await expect(dialog.getByText('Rotate a piece', { exact: true })).toBeVisible();
  // Their descriptions render as plain text (no kbd chips).
  await expect(dialog.getByText('Scroll or pinch')).toBeVisible();
  await expect(dialog.getByText('Drag its rotation ring')).toBeVisible();

  await page.screenshot({ path: `/tmp/pr-292-${testInfo.project.name}.png` });
});

test('Esc closes the shortcuts reference', async ({ page }) => {
  await openFurnishView(page);

  await page.getByRole('button', { name: 'Keyboard shortcuts' }).click();
  const dialog = page.getByRole('dialog', { name: 'Shortcuts and gestures' });
  await expect(dialog).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('the shortcuts trigger sits in the top bar, clear of the back button, the proposal switcher and the bottom dock', async ({
  page,
}, testInfo) => {
  // Regression guard: the trigger lives beside the back button in the room top
  // bar (not the bottom dock's ActionBar, which has no width to spare — see
  // e2e/bottom-dock.spec.ts). Forced to the #170 repro viewport so this is
  // checked at the exact narrow width that pill family is tuned for.
  await page.setViewportSize({ width: 390, height: 844 });
  await openFurnishView(page);

  const back = page.getByRole('button', { name: 'Back to your rooms' });
  const trigger = page.getByRole('button', { name: 'Keyboard shortcuts' });
  const switcher = page.locator('.proposal-pill');
  await expect(back).toBeVisible();
  await expect(trigger).toBeVisible();
  await expect(switcher).toBeVisible();

  const backBox = await back.boundingBox();
  const triggerBox = await trigger.boundingBox();
  const switcherBox = await switcher.boundingBox();
  if (!backBox || !triggerBox || !switcherBox) throw new Error('top bar control not measurable');

  console.log(
    `[${testInfo.project.name}, 390x844] back x ${backBox.x.toFixed(1)}-${(backBox.x + backBox.width).toFixed(1)} | ` +
      `shortcuts x ${triggerBox.x.toFixed(1)}-${(triggerBox.x + triggerBox.width).toFixed(1)} | ` +
      `switcher x ${switcherBox.x.toFixed(1)}-${(switcherBox.x + switcherBox.width).toFixed(1)}`,
  );

  // The trigger sits after the back button and clears the centred switcher —
  // no overlap between any of the three.
  expect(backBox.x + backBox.width).toBeLessThanOrEqual(triggerBox.x);
  expect(triggerBox.x + triggerBox.width).toBeLessThanOrEqual(switcherBox.x);

  // The bottom dock's "Add furniture" pill is unaffected by this change.
  await expect(page.getByRole('button', { name: 'Add furniture' })).toBeVisible();
});
