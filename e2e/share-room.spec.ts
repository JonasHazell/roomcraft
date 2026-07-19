import { test, expect } from '@playwright/test';

/**
 * #353: a read-only shareable link — the first step toward planning a room
 * together. "Share" in the proposal switcher's menu posts a point-in-time
 * snapshot of the room and shows a copyable `#share/:id` link; opening that
 * link (even with no cookies/local data at all, i.e. a stranger clicking it)
 * renders the room read-only, with no dock, no side panel, and no selection.
 *
 * There's no live backend/database in this environment (see server/share.ts),
 * so `/api/share` (create) and `/api/share/:id` (read) are mocked via
 * `page.route`, the same pattern `ai-generation-limit.spec.ts` uses for
 * `/api/proposals`.
 */

const SHARE_ID = 'share-abc123';

const bed = {
  id: 'f1',
  kind: 'bed',
  name: 'Bed',
  position: { x: 0, z: 0 },
  rotationY: 0,
  size: { width: 1.4, depth: 2, height: 0.5 },
  elevation: 0,
  color: '#aabbcc',
};

// `furniture`/`floorColor`/etc. at the room's top level mirror the active
// proposal (see src/types.ts's `Design`) — both must carry the bed, or the
// store's own load-time normalization (which trusts the proposal, not the
// mirror) would otherwise show an empty room.
const room = {
  id: 'room-1',
  name: 'Sunroom',
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
  furniture: [bed],
  proposals: [
    {
      id: 'p1',
      name: 'Proposal 1',
      furniture: [bed],
      floorColor: '#c9a878',
      wallColor: '#efe8da',
      floorMaterial: 'matte',
      wallMaterial: 'matte',
    },
  ],
  activeProposalId: 'p1',
};

const project = {
  schemaVersion: 5,
  name: 'My rooms',
  updatedAt: new Date().toISOString(),
  rooms: [room],
  activeRoomId: 'room-1',
};

test.beforeEach(async ({ page, context }) => {
  // The "Copy link" button uses the real Clipboard API; grant it up front so
  // that assertion isn't flaky under headless Chromium's default permissions.
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  // POST /api/share — hands back an opaque id; the real server would validate
  // and store the snapshot (server/share.ts), which is covered separately by
  // server/share.test.ts and src/lib/persistence.test.ts's parseDesign tests.
  await page.route('**/api/share', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: SHARE_ID }),
    });
  });
  // GET /api/share/:id — the stored snapshot, read back by the viewer.
  await page.route(`**/api/share/${SHARE_ID}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ design: room }),
    });
  });
  await page.addInitScript((p) => {
    localStorage.setItem('roomcraft:current', JSON.stringify({ state: { project: p }, version: 5 }));
  }, project);
  await page.goto('/');
});

test('sharing a room gives a link; opening it in a fresh context shows a read-only view', async ({
  page,
  browser,
}, testInfo) => {
  // Two full react-three-fiber scenes load in this one test (the furnish view,
  // then the shared viewer in a second context), and each click's actionability
  // check competes with r3f's render loop for the main thread — the same
  // mobile-CI flakiness furniture-picker-search.spec.ts already works around.
  // Give this test the same headroom.
  test.setTimeout(120000);

  await page
    .locator('.room-card', { hasText: 'Sunroom' })
    .getByRole('button', { name: 'Edit plan' })
    .click();
  await page.getByRole('button', { name: 'Furnish this room' }).click();
  await expect(page.getByRole('button', { name: 'Add furniture' })).toBeVisible();

  await page.locator('.proposal-pill').click();
  await expect(page.getByRole('menu', { name: 'Furnishing proposals' })).toBeVisible();
  await page.getByRole('button', { name: 'Share' }).click();

  const dialog = page.getByRole('dialog', { name: 'Share this room' });
  await expect(dialog).toBeVisible();
  const linkField = dialog.getByLabel('Share link');
  await expect(linkField).toHaveValue(new RegExp(`#share/${SHARE_ID}$`));
  const shareUrl = await linkField.inputValue();

  await dialog.getByRole('button', { name: 'Copy link' }).click();
  await expect(dialog.getByText('Copied!')).toBeVisible();

  await page.screenshot({ path: `/tmp/pr-353-share-dialog-${testInfo.project.name}.png` });

  // Both the header icon button and the footer text button are named "Close";
  // scope to the footer one (the header's X is covered by the Esc/backdrop
  // pattern every other dialog already shares).
  await dialog.locator('.modal-foot').getByRole('button', { name: 'Close' }).click();
  await expect(dialog).toHaveCount(0);

  // Open the link in a brand-new browser context — no cookies, no
  // localStorage, standing in for a stranger who just received the link.
  const consoleErrors: string[] = [];
  const viewerContext = await browser.newContext();
  const viewerPage = await viewerContext.newPage();
  viewerPage.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  viewerPage.on('pageerror', (err) => consoleErrors.push(String(err)));
  // page.route mocks are per-context, so the fresh context needs its own.
  await viewerPage.route(`**/api/share/${SHARE_ID}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ design: room }),
    });
  });

  await viewerPage.goto(shareUrl);

  await expect(
    viewerPage.getByText(/This is a shared view of a RoomCraft room/),
  ).toBeVisible();
  // The lazy-loaded scene chunk plus a fresh WebGL context competes with the
  // r3f render loop under mobile-CI load (same rationale as the test-level
  // timeout above), so give this specific assertion more than the 5s default.
  await expect(viewerPage.locator('canvas')).toBeVisible({ timeout: 20000 });

  // Read-only: none of the furnish view's editing chrome exists at all.
  await expect(viewerPage.getByRole('button', { name: 'Add furniture' })).toHaveCount(0);
  await expect(viewerPage.locator('.proposal-switcher')).toHaveCount(0);
  await expect(viewerPage.locator('.selection-bar-wrap')).toHaveCount(0);
  await expect(viewerPage.locator('.side-panel')).toHaveCount(0);

  // Give the exterior-wall camera-facing fade (mirrors scene/Walls.tsx) a
  // moment to settle so the screenshot shows the room, not a cold-start frame
  // where the near wall is still fully opaque.
  await viewerPage.waitForTimeout(500);
  await viewerPage.screenshot({ path: `/tmp/pr-353-share-viewer-${testInfo.project.name}.png` });

  expect(consoleErrors).toEqual([]);
  await viewerContext.close();
});

test('an unknown share id shows a clear, honest error instead of a blank page', async ({
  page,
}) => {
  await page.route('**/api/share/does-not-exist', async (route) => {
    await route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'This shared room link is invalid or has expired.' }),
    });
  });
  await page.goto('/#share/does-not-exist');
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByText('This shared room link is invalid or has expired.')).toBeVisible();
});
