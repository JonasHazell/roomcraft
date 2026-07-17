import { describe, expect, it } from 'vitest';
import type { Bounds } from '../../lib/polygon';
import { MIN_FIT_HEIGHT_FRACTION, availableFitHeight, fitViewBox } from './useViewport';

/**
 * Regression coverage for #249: the mobile wall-detail sheet is fed to the
 * viewport as a large bottom inset, and the auto-fit used to subtract it from the
 * canvas height with no lower bound (`availH = size.h - top - bottom`). On a phone
 * the sheet (`min(48vh, 460px)` + ~82px dock offset) reserves most of the canvas,
 * so the room was fit into a sliver a few dozen px tall and a wall tap missed.
 *
 * The fix floors the available fitting height at {@link MIN_FIT_HEIGHT_FRACTION}
 * of the canvas height. These tests assert the ACTUAL computed band — not just
 * that it "looks right" — for both the flooring case (a tall mobile sheet) and the
 * pass-through case (a small/desktop-height inset that must stay untouched).
 */

// A ~393x851 Pixel-5-ish canvas: exactly the mobile viewport the e2e run uses.
const MOBILE_H = 851;
// The worst-case sheet reservation on that phone: min(48vh, 460) + ~82 dock
// offset + 8 measure pad, plus the 56px top inset PlanEditor adds while the
// sheet is open. 0.48 * 851 = 408.48, so panelInset ~= 408 + 90 = 498.
const SHEET_BOTTOM = 498;
const TOP_WITH_SHEET = 56;

describe('availableFitHeight (#249 auto-fit floor)', () => {
  it('floors a tall mobile sheet inset at 40% of the canvas height', () => {
    const reduced = MOBILE_H - TOP_WITH_SHEET - SHEET_BOTTOM; // 851 - 56 - 498 = 297
    const floor = MOBILE_H * MIN_FIT_HEIGHT_FRACTION; // 851 * 0.4 = 340.4

    // Sanity: without the floor the sheet really would leave a sub-floor sliver.
    expect(reduced).toBe(297);
    expect(reduced).toBeLessThan(floor);

    // The floor wins, so the drawing keeps a 340.4px band instead of 297px.
    expect(availableFitHeight(MOBILE_H, TOP_WITH_SHEET, SHEET_BOTTOM)).toBeCloseTo(340.4, 5);
  });

  it('leaves a small / no inset untouched (desktop + closed-sheet behaviour)', () => {
    // No sheet open: the whole canvas is available, floor is inert.
    expect(availableFitHeight(MOBILE_H, 0, 0)).toBe(MOBILE_H);

    // A desktop-height canvas with a modest inset stays exactly reduced — the
    // 40% floor (720 * 0.4 = 288) is far below the 544px the inset leaves, so the
    // fit is byte-for-byte the same as before the clamp existed.
    const DESKTOP_H = 720;
    expect(DESKTOP_H - 56 - 120).toBeGreaterThan(DESKTOP_H * MIN_FIT_HEIGHT_FRACTION);
    expect(availableFitHeight(DESKTOP_H, 56, 120)).toBe(544);
  });

  it('ignores negative insets', () => {
    expect(availableFitHeight(800, -10, -10)).toBe(800);
  });
});

describe('fitViewBox (#249)', () => {
  // A 3m x 3m room centred on the origin, like the "Small room" template.
  const room: Bounds = { minX: -1.5, maxX: 1.5, minZ: -1.5, maxZ: 1.5 };
  const H = room.maxZ - room.minZ; // 3 m

  it('scales the room to the floored band, not the sub-floor sliver', () => {
    const size = { w: 393, h: MOBILE_H };
    const box = fitViewBox(room, size, { top: TOP_WITH_SHEET, bottom: SHEET_BOTTOM });

    // The vertical axis binds (a 393px-wide canvas fits 3m easily), so the scale
    // is availH / H. The floor makes availH 340.4px, giving 340.4/3 = 113.47 px/m
    // rather than the un-floored 297/3 = 99 px/m — a bigger, tappable drawing.
    const flooredScale = availableFitHeight(MOBILE_H, TOP_WITH_SHEET, SHEET_BOTTOM) / H;
    const viewW = box.maxX - box.minX;
    expect(viewW).toBeCloseTo(size.w / flooredScale, 5); // ~3.464 m across the canvas

    // Cross-check: had it used the un-floored 297px band, the room would appear
    // smaller (a wider viewBox in world units), which we must NOT see.
    const unflooredViewW = size.w / ((MOBILE_H - TOP_WITH_SHEET - SHEET_BOTTOM) / H);
    expect(viewW).toBeLessThan(unflooredViewW);
  });

  it('is unchanged from a plain centred fit when the inset stays under the floor', () => {
    const size = { w: 1280, h: 720 };
    const insets = { top: 56, bottom: 120 };
    const box = fitViewBox(room, size, insets);

    // availH = 720 - 56 - 120 = 544, well above the 288px floor, so the fit uses
    // the reduced band verbatim. Recompute the expected viewBox by hand from the
    // un-floored formula to prove the clamp did not alter the result.
    const availH = 544;
    const scale = Math.min(size.w / (room.maxX - room.minX), availH / H);
    const viewW = size.w / scale;
    const viewH = size.h / scale;
    const minX = room.minX - (viewW - (room.maxX - room.minX)) / 2;
    const bandTop = insets.top / scale;
    const minZ = room.minZ - (bandTop + (availH / scale - H) / 2);
    expect(box.minX).toBeCloseTo(minX, 6);
    expect(box.maxX).toBeCloseTo(minX + viewW, 6);
    expect(box.minZ).toBeCloseTo(minZ, 6);
    expect(box.maxZ).toBeCloseTo(minZ + viewH, 6);
  });

  it('returns content unchanged for a degenerate size', () => {
    expect(fitViewBox(room, null, NO_INSETS())).toBe(room);
    expect(fitViewBox(room, { w: 0, h: 0 }, NO_INSETS())).toBe(room);
  });
});

function NO_INSETS() {
  return { top: 0, bottom: 0 };
}
