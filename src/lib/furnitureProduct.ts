/**
 * Helpers for {@link FurnitureProduct} — the first, smallest step toward the
 * vision's furniture-catalogue revenue model (`VISION.md#how-it-makes-money`,
 * `STRATEGY.md#monetization-is-in-play`): planning that leads all the way to
 * purchase.
 *
 * Today a product is user-entered metadata (paste the link to the sofa you're
 * planning to buy); the same shape is the scaffold a future affiliate/catalogue
 * integration and a "Buy this room" cart total would build on. It is deliberately
 * sparse and optional — a piece without a product is the norm — matching the same
 * degrade-don't-reject convention as per-part colours/materials.
 */
import type { FurnitureProduct } from '../types';

export type { FurnitureProduct };

/** Longest retailer name we keep; anything longer is truncated on normalize. */
const MAX_RETAILER_LEN = 60;

/**
 * The display currency for a product price. A deliberate v1 default: RoomCraft has
 * no per-user locale/currency concept yet, and USD is the least-surprising neutral
 * choice until multi-currency lands with the real catalogue integration. Named here
 * so there's one place to revisit.
 */
const PRICE_CURRENCY = 'USD';
const PRICE_LOCALE = 'en-US';
const priceFormatter = new Intl.NumberFormat(PRICE_LOCALE, {
  style: 'currency',
  currency: PRICE_CURRENCY,
});

/** True when a string is an absolute http(s) URL we're willing to link out to. */
export function isValidProductUrl(url: string): boolean {
  try {
    const u = new URL(url.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Coerce arbitrary stored/entered data into a sound {@link FurnitureProduct}, or
 * `undefined` when there's no usable link. Degrades rather than rejects, mirroring
 * `normalizeColors`/`normalizeMaterials`: an invalid URL drops the whole product;
 * a bad price or retailer drops just that field, never the link.
 */
export function normalizeProduct(raw: unknown): FurnitureProduct | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Record<string, unknown>;
  const url = typeof r.url === 'string' ? r.url.trim() : '';
  if (!isValidProductUrl(url)) return undefined;

  const out: FurnitureProduct = { url };
  if (typeof r.priceCents === 'number' && Number.isFinite(r.priceCents) && r.priceCents >= 0) {
    out.priceCents = Math.round(r.priceCents);
  }
  if (typeof r.retailer === 'string' && r.retailer.trim()) {
    out.retailer = r.retailer.trim().slice(0, MAX_RETAILER_LEN);
  }
  return out;
}

/** Format a whole-cents price for display, e.g. `12900` → `"$129.00"`. */
export function formatPrice(priceCents: number): string {
  return priceFormatter.format(priceCents / 100);
}

/** The visible label for the Buy control — "Buy", plus the price when known. */
export function buyButtonLabel(product: FurnitureProduct): string {
  return product.priceCents != null ? `Buy · ${formatPrice(product.priceCents)}` : 'Buy';
}

/** The fuller Buy title/aria — names the retailer and price and that it leaves the app. */
export function buyButtonTitle(product: FurnitureProduct): string {
  const at = product.retailer ? ` at ${product.retailer}` : '';
  const price = product.priceCents != null ? ` for ${formatPrice(product.priceCents)}` : '';
  return `Buy this piece${at}${price} (opens in a new tab)`;
}
