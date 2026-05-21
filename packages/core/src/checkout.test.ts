import { describe, it, expect } from 'vitest';
import { calculateCheckoutAmounts, normalizeCheckoutMethod } from './checkout';

describe('normalizeCheckoutMethod', () => {
  it('returns pix_upfront unchanged', () => {
    expect(normalizeCheckoutMethod('pix_upfront')).toBe('pix_upfront');
  });
  it('converts pay_on_site to deposit_plus_on_site', () => {
    expect(normalizeCheckoutMethod('pay_on_site')).toBe('deposit_plus_on_site');
  });
  it('returns deposit_plus_on_site unchanged', () => {
    expect(normalizeCheckoutMethod('deposit_plus_on_site')).toBe('deposit_plus_on_site');
  });
  it('defaults unknown to pix_upfront', () => {
    expect(normalizeCheckoutMethod('unknown')).toBe('pix_upfront');
    expect(normalizeCheckoutMethod(undefined)).toBe('pix_upfront');
    expect(normalizeCheckoutMethod(null)).toBe('pix_upfront');
  });
});

describe('calculateCheckoutAmounts', () => {
  const defaultSettings = { platformFeeCents: 500, depositPercentage: 50 };

  it('pix_upfront: seller gets all, platform fee on top', () => {
    const result = calculateCheckoutAmounts(12000, 1, 'pix_upfront', defaultSettings);
    expect(result.totalCents).toBe(12000);
    expect(result.sellerAmountCents).toBe(12000);
    expect(result.platformFeeCents).toBe(500);
    expect(result.dueNowCents).toBe(12500);
    expect(result.dueOnSiteCents).toBe(0);
  });

  it('deposit_plus_on_site: 50% now + 50% on site', () => {
    const result = calculateCheckoutAmounts(12000, 1, 'deposit_plus_on_site', defaultSettings);
    expect(result.sellerAmountCents).toBe(6000);
    expect(result.dueOnSiteCents).toBe(6000);
    expect(result.dueNowCents).toBe(6500); // 6000 + 500 fee
  });

  it('scales platform fee by booking count', () => {
    const result = calculateCheckoutAmounts(24000, 2, 'pix_upfront', defaultSettings);
    expect(result.platformFeeCents).toBe(1000); // 500 × 2
    expect(result.dueNowCents).toBe(25000);
  });

  it('throws when total <= platform fee', () => {
    expect(() =>
      calculateCheckoutAmounts(500, 1, 'pix_upfront', { platformFeeCents: 500 }),
    ).toThrow('maior que a taxa da plataforma');
  });

  it('throws when total < fee with multiple bookings', () => {
    expect(() =>
      calculateCheckoutAmounts(800, 2, 'pix_upfront', { platformFeeCents: 500 }),
    ).toThrow();
  });

  it('uses env fallbacks when settings are null', () => {
    const result = calculateCheckoutAmounts(10000, 1, 'pix_upfront', null, {
      platformFeeCents: '300',
    });
    expect(result.platformFeeCents).toBe(300);
  });

  it('defaults to 500 cent fee when nothing provided', () => {
    const result = calculateCheckoutAmounts(10000, 1, 'pix_upfront');
    expect(result.platformFeeCents).toBe(500);
  });

  it('caps depositPercentage at 100', () => {
    const result = calculateCheckoutAmounts(10000, 1, 'deposit_plus_on_site', {
      platformFeeCents: 500,
      depositPercentage: 150,
    });
    expect(result.depositPercentage).toBe(100);
    expect(result.sellerAmountCents).toBe(10000);
  });
});
