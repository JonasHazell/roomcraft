import { test, expect } from '@playwright/test';

/**
 * #352: the first freemium gate. A signed-in 'free'-plan account is capped at
 * a lifetime number of AI furnishing generations (server/planLimits.ts's
 * FREE_TIER_GENERATION_CAP); once used up, `/api/proposals` returns a 402
 * `{ error: 'limit' }` instead of running the (costly) generation, and the
 * client shows a calm upgrade prompt (UpgradeDialog) instead of the generic
 * AI-failure message. There's no real backend/database in this environment,
 * so the auth and proposals endpoints are mocked via `page.route` to drive
 * the client-side gating and UI end to end.
 */

const CAP = 5;
const LIMIT_MESSAGE = `You've used all ${CAP} of your free AI generations. Upgrade to Pro for unlimited AI furnishing.`;

const project = {
  schemaVersion: 5,
  name: 'My rooms',
  updatedAt: new Date().toISOString(),
  rooms: [
    {
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
  // A signed-in free-plan account that has already used every generation, so
  // the very next request hits the wall.
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: { id: 'u1', email: 'reader@example.com', plan: 'free', aiGenerationsUsed: CAP },
        authEnabled: true,
        aiGenerationCap: CAP,
      }),
    });
  });
  // The server's freemium gate (server/index.ts) blocks the request before
  // ever calling generateProposals — mocked here as the 402 it would send.
  await page.route('**/api/proposals', async (route) => {
    await route.fulfill({
      status: 402,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'limit', message: LIMIT_MESSAGE }),
    });
  });

  await page.addInitScript((p) => {
    localStorage.setItem('roomcraft:current', JSON.stringify({ state: { project: p }, version: 5 }));
  }, project);
  await page.goto('/');
});

test('hitting the free-tier AI cap shows a calm upgrade prompt instead of a generic error', async ({
  page,
}, testInfo) => {
  await page
    .locator('.room-card', { hasText: 'Sunroom' })
    .getByRole('button', { name: 'Edit plan' })
    .click();
  await page.getByRole('button', { name: 'Furnish this room' }).click();
  await expect(page.getByRole('button', { name: 'Add furniture' })).toBeVisible();

  await page.locator('.proposal-pill').click();
  await expect(page.getByRole('menu', { name: 'Furnishing proposals' })).toBeVisible();
  await page.getByRole('button', { name: 'Suggest 3 layouts' }).click();

  // Signed in, so the AI panel (not the sign-in prompt) shows — with the
  // remaining-generations context surfaced before the wall is ever hit.
  const needsField = page.getByLabel('Needs & wishes');
  await expect(needsField).toBeVisible();
  await expect(page.getByText(`0 of ${CAP} free generations left.`)).toBeVisible();

  await needsField.fill('Bedroom for two');
  await page.getByRole('button', { name: 'Suggest furnishing' }).click();

  // The generic AI-failure message never shows; the limit dialog does instead.
  await expect(page.getByRole('alert')).toHaveCount(0);
  const dialog = page.getByRole('dialog', { name: 'Upgrade to Pro' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(LIMIT_MESSAGE)).toBeVisible();

  await page.screenshot({ path: `/tmp/pr-352-limit-${testInfo.project.name}.png` });

  // "Upgrade" is an honest placeholder — no payment flow, just a coming-soon
  // notice — and Esc closes the dialog like every other overlay.
  await dialog.getByRole('button', { name: 'Upgrade' }).click();
  await expect(dialog.getByText(/aren.t open yet/i)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
});
