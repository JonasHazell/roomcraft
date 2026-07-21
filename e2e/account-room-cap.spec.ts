import { test, expect } from '@playwright/test';

/**
 * Regression coverage for issue #369: a signed-in user's project syncs to
 * their account (`lib/projectSync.ts` → `PUT /api/project`), and the free
 * tier caps how many rooms that account can save (`server/projects.ts`'s
 * `FREE_ROOM_LIMIT`). When a save is rejected for being over the cap, a calm
 * upgrade prompt (`RoomCapDialog`) explains it — the room itself stays right
 * where it was (this device's local storage); only the account's cloud copy
 * doesn't catch up.
 *
 * No real backend runs under Playwright's dev-server webServer, so every
 * `/api/*` call the sync logic makes is mocked via `page.route`.
 */

function room(id: string, name: string) {
  return {
    id,
    name,
    updatedAt: new Date().toISOString(),
    room: { height: 2.5 },
    floorColor: '#c9a878',
    wallColor: '#efe8da',
    floorMaterial: 'matte',
    wallMaterial: 'matte',
    walls: [],
    openings: [],
    furniture: [],
    proposals: [
      { id: `${id}-p1`, name: 'Proposal 1', furniture: [], floorColor: '#c9a878', wallColor: '#efe8da', floorMaterial: 'matte', wallMaterial: 'matte' },
    ],
    activeProposalId: `${id}-p1`,
  };
}

function projectWithRooms(count: number) {
  const rooms = Array.from({ length: count }, (_, i) => room(`room-${i + 1}`, `Room ${i + 1}`));
  return {
    schemaVersion: 5,
    name: 'My rooms',
    updatedAt: new Date().toISOString(),
    rooms,
    activeRoomId: rooms[0].id,
  };
}

async function mockSignedIn(page: import('@playwright/test').Page) {
  await page.route('**/api/auth/me', (route) =>
    route.fulfill({
      json: { user: { id: 'user-1', email: 'test@example.com' }, authEnabled: true },
    }),
  );
  await page.route('**/api/project', (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ json: { project: null } });
    }
    return route.continue();
  });
}

test('a free account over the room cap sees a calm upgrade prompt', async ({ page }) => {
  await page.addInitScript((p) => {
    localStorage.setItem('roomcraft:current', JSON.stringify({ state: { project: p }, version: 5 }));
  }, projectWithRooms(4));
  await mockSignedIn(page);
  await page.route('**/api/project', async (route) => {
    if (route.request().method() !== 'PUT') return route.fallback();
    return route.fulfill({
      status: 409,
      json: {
        error: 'Free accounts can save up to 3 rooms to their account. Delete a room, or upgrade to Pro for unlimited rooms.',
        code: 'room_cap_exceeded',
        limit: 3,
      },
    });
  });

  await page.goto('/');

  const dialog = page.getByRole('dialog', { name: 'Free plan room limit' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/up to 3 rooms/i)).toBeVisible();

  await dialog.getByRole('button', { name: 'Got it' }).click();
  await expect(dialog).toBeHidden();
});

test('a free account at or under the room cap syncs without any prompt', async ({ page }) => {
  await page.addInitScript((p) => {
    localStorage.setItem('roomcraft:current', JSON.stringify({ state: { project: p }, version: 5 }));
  }, projectWithRooms(2));
  await mockSignedIn(page);
  await page.route('**/api/project', async (route) => {
    if (route.request().method() !== 'PUT') return route.fallback();
    return route.fulfill({ json: { ok: true } });
  });

  await page.goto('/');

  // Give the debounced sync a moment to run, then confirm no upgrade prompt appeared.
  await expect(page.getByText('Room 1')).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Free plan room limit' })).toHaveCount(0);
});
