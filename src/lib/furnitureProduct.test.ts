import { describe, expect, it } from 'vitest';
import {
  buyButtonLabel,
  buyButtonTitle,
  formatPrice,
  isValidProductUrl,
  normalizeProduct,
} from './furnitureProduct';

describe('isValidProductUrl', () => {
  it('accepts absolute http(s) links', () => {
    expect(isValidProductUrl('https://example.com/sofa')).toBe(true);
    expect(isValidProductUrl('http://shop.test/item?id=1')).toBe(true);
    expect(isValidProductUrl('  https://example.com/x  ')).toBe(true); // trimmed
  });

  it('rejects non-http(s) and malformed strings', () => {
    expect(isValidProductUrl('example.com')).toBe(false);
    expect(isValidProductUrl('ftp://example.com')).toBe(false);
    expect(isValidProductUrl('javascript:alert(1)')).toBe(false);
    expect(isValidProductUrl('')).toBe(false);
    expect(isValidProductUrl('not a url')).toBe(false);
  });
});

describe('normalizeProduct', () => {
  it('keeps a full, valid product', () => {
    expect(
      normalizeProduct({ url: 'https://example.com/sofa', priceCents: 12900, retailer: 'IKEA' }),
    ).toEqual({ url: 'https://example.com/sofa', priceCents: 12900, retailer: 'IKEA' });
  });

  it('trims the url and keeps just the link when price/retailer are absent', () => {
    expect(normalizeProduct({ url: '  https://example.com/x  ' })).toEqual({
      url: 'https://example.com/x',
    });
  });

  it('drops the whole product when the url is invalid or missing', () => {
    expect(normalizeProduct({ url: 'not-a-url', priceCents: 100 })).toBeUndefined();
    expect(normalizeProduct({ priceCents: 100 })).toBeUndefined();
    expect(normalizeProduct(null)).toBeUndefined();
    expect(normalizeProduct('https://example.com')).toBeUndefined();
  });

  it('drops just a bad price or retailer, never the link', () => {
    expect(normalizeProduct({ url: 'https://example.com', priceCents: -5 })).toEqual({
      url: 'https://example.com',
    });
    expect(normalizeProduct({ url: 'https://example.com', priceCents: Number.NaN })).toEqual({
      url: 'https://example.com',
    });
    expect(normalizeProduct({ url: 'https://example.com', retailer: '   ' })).toEqual({
      url: 'https://example.com',
    });
  });

  it('rounds fractional cents and truncates an over-long retailer', () => {
    const p = normalizeProduct({
      url: 'https://example.com',
      priceCents: 1299.6,
      retailer: 'x'.repeat(200),
    });
    expect(p?.priceCents).toBe(1300);
    expect(p?.retailer?.length).toBe(60);
  });
});

describe('price + buy labels', () => {
  it('formats whole cents as a currency string', () => {
    expect(formatPrice(12900)).toBe('$129.00');
    expect(formatPrice(0)).toBe('$0.00');
  });

  it('builds a Buy label with the price when known, plain "Buy" otherwise', () => {
    expect(buyButtonLabel({ url: 'https://x.test', priceCents: 9900 })).toBe('Buy · $99.00');
    expect(buyButtonLabel({ url: 'https://x.test' })).toBe('Buy');
  });

  it('names the retailer and price in the Buy title', () => {
    expect(buyButtonTitle({ url: 'https://x.test', priceCents: 9900, retailer: 'IKEA' })).toBe(
      'Buy this piece at IKEA for $99.00 (opens in a new tab)',
    );
    expect(buyButtonTitle({ url: 'https://x.test' })).toBe(
      'Buy this piece (opens in a new tab)',
    );
  });
});
