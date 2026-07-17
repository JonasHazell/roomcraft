import { test, expect } from '@playwright/test';

/**
 * Regression coverage for issue #250: a drawn room's lobby card thumbnail is a
 * small SVG outline of its own floor plan (`templatePath(floorPolygon(...))`,
 * the same helper + styling the New room flow's shape chooser already uses
 * for its `.template-preview` cards — see `PlanStartChooser.tsx`), not a fixed
 * generic `Icon name="square"` glyph. Two differently-shaped rooms must render
 * visibly different outlines, so cards become distinguishable by shape at a
 * glance instead of showing the pixel-identical icon for every room.
 *
 * A fresh browser context has empty localStorage, so we seed two rooms directly
 * (schema v5, see src/lib/persistence.ts) — one a plain square, one an L-shape —
 * the same seeding approach as e2e/plan-furnish-shortcut.spec.ts.
 */

const project = {
  schemaVersion: 5,
  name: 'My rooms',
  updatedAt: new Date().toISOString(),
  rooms: [
    {
      id: 'room-square',
      name: 'Square room',
      updatedAt: new Date().toISOString(),
      room: { height: 2.5 },
      floorColor: '#c9a878',
      wallColor: '#efe8da',
      floorMaterial: 'matte',
      wallMaterial: 'matte',
      walls: [
        { id: 'w1', kind: 'exterior', a: { x: -1.5, z: -1.5 }, b: { x: 1.5, z: -1.5 } },
        { id: 'w2', kind: 'exterior', a: { x: 1.5, z: -1.5 }, b: { x: 1.5, z: 1.5 } },
        { id: 'w3', kind: 'exterior', a: { x: 1.5, z: 1.5 }, b: { x: -1.5, z: 1.5 } },
        { id: 'w4', kind: 'exterior', a: { x: -1.5, z: 1.5 }, b: { x: -1.5, z: -1.5 } },
      ],
      openings: [],
      furniture: [],
      proposals: [
        {
          id: 'p-square',
          name: 'Proposal 1',
          furniture: [],
          floorColor: '#c9a878',
          wallColor: '#efe8da',
          floorMaterial: 'matte',
          wallMaterial: 'matte',
        },
      ],
      activeProposalId: 'p-square',
    },
    {
      id: 'room-l-shape',
      name: 'L-shaped room',
      updatedAt: new Date().toISOString(),
      room: { height: 2.5 },
      floorColor: '#c9a878',
      wallColor: '#efe8da',
      floorMaterial: 'matte',
      wallMaterial: 'matte',
      // A 5x5 plan with a 2.5x2.5 corner removed — same shape as the
      // ROOM_TEMPLATES "l-shape" template in src/lib/roomTemplates.ts.
      walls: [
        { id: 'w1', kind: 'exterior', a: { x: -2.5, z: -2.5 }, b: { x: 2.5, z: -2.5 } },
        { id: 'w2', kind: 'exterior', a: { x: 2.5, z: -2.5 }, b: { x: 2.5, z: 0 } },
        { id: 'w3', kind: 'exterior', a: { x: 2.5, z: 0 }, b: { x: 0, z: 0 } },
        { id: 'w4', kind: 'exterior', a: { x: 0, z: 0 }, b: { x: 0, z: 2.5 } },
        { id: 'w5', kind: 'exterior', a: { x: 0, z: 2.5 }, b: { x: -2.5, z: 2.5 } },
        { id: 'w6', kind: 'exterior', a: { x: -2.5, z: 2.5 }, b: { x: -2.5, z: -2.5 } },
      ],
      openings: [],
      furniture: [],
      proposals: [
        {
          id: 'p-l-shape',
          name: 'Proposal 1',
          furniture: [],
          floorColor: '#c9a878',
          wallColor: '#efe8da',
          floorMaterial: 'matte',
          wallMaterial: 'matte',
        },
      ],
      activeProposalId: 'p-l-shape',
    },
    {
      id: 'room-undrawn',
      name: 'Blank room',
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
        {
          id: 'p-undrawn',
          name: 'Proposal 1',
          furniture: [],
          floorColor: '#c9a878',
          wallColor: '#efe8da',
          floorMaterial: 'matte',
          wallMaterial: 'matte',
        },
      ],
      activeProposalId: 'p-undrawn',
    },
  ],
  activeRoomId: 'room-square',
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript((p) => {
    localStorage.setItem('roomcraft:current', JSON.stringify({ state: { project: p }, version: 5 }));
  }, project);
  await page.goto('/');
});

test('drawn rooms show distinct floor-plan-shaped thumbnails', async ({ page }) => {
  const squareThumb = page
    .locator('.room-card', { hasText: 'Square room' })
    .locator('.room-card-thumb-svg path');
  const lShapeThumb = page
    .locator('.room-card', { hasText: 'L-shaped room' })
    .locator('.room-card-thumb-svg path');

  await expect(squareThumb).toBeVisible();
  await expect(lShapeThumb).toBeVisible();

  const squareD = await squareThumb.getAttribute('d');
  const lShapeD = await lShapeThumb.getAttribute('d');

  expect(squareD).toBeTruthy();
  expect(lShapeD).toBeTruthy();
  // Different floor plans must render different outline paths — not the same
  // fixed glyph for every room.
  expect(squareD).not.toBe(lShapeD);
  // The L-shape has six corners vs. the square's four, so its path has more
  // segments — a concrete, non-tautological difference beyond "not equal".
  expect(lShapeD?.split(/[ML]/).length).toBeGreaterThan(squareD?.split(/[ML]/).length ?? 0);
});

test('a room with no floor plan yet keeps the pencil icon, not a shape outline', async ({ page }) => {
  const blankCard = page.locator('.room-card', { hasText: 'Blank room' });
  await expect(blankCard.locator('.room-card-thumb-svg')).toHaveCount(0);
  await expect(blankCard).toContainText('No floor plan yet');
});
