import { describe, it, expect } from 'vitest';
import { mapValidapayStatus, resolveWebhookStatus, bookingPatchFromPaymentStatus } from './payments';

describe('mapValidapayStatus', () => {
  it('maps PAID variants to paid', () => {
    expect(mapValidapayStatus('PAID')).toBe('paid');
    expect(mapValidapayStatus('paid')).toBe('paid');
    expect(mapValidapayStatus('CONFIRMED')).toBe('paid');
    expect(mapValidapayStatus('COMPLETED')).toBe('paid');
    expect(mapValidapayStatus('SUCCESS')).toBe('paid');
    expect(mapValidapayStatus('APPROVED')).toBe('paid');
  });

  it('maps EXPIRED/CANCELLED to expired', () => {
    expect(mapValidapayStatus('EXPIRED')).toBe('expired');
    expect(mapValidapayStatus('CANCELLED')).toBe('expired');
  });

  it('maps FAILED/REJECTED/ERROR to failed', () => {
    expect(mapValidapayStatus('FAILED')).toBe('failed');
    expect(mapValidapayStatus('REJECTED')).toBe('failed');
    expect(mapValidapayStatus('ERROR')).toBe('failed');
  });

  it('maps REFUNDED to refunded', () => {
    expect(mapValidapayStatus('REFUNDED')).toBe('refunded');
  });

  it('maps unknown to pending', () => {
    expect(mapValidapayStatus('WHATEVER')).toBe('pending');
    expect(mapValidapayStatus(null)).toBe('pending');
    expect(mapValidapayStatus(undefined)).toBe('pending');
    expect(mapValidapayStatus('')).toBe('pending');
  });
});

describe('resolveWebhookStatus', () => {
  it('returns null when rawStatus is empty', () => {
    expect(resolveWebhookStatus(null, 'pending')).toBeNull();
    expect(resolveWebhookStatus('', 'pending')).toBeNull();
  });

  it('returns null when status would not change', () => {
    expect(resolveWebhookStatus('PAID', 'paid')).toBeNull();
  });

  it('returns new status when changed', () => {
    expect(resolveWebhookStatus('PAID', 'pending')).toBe('paid');
    expect(resolveWebhookStatus('EXPIRED', 'pending')).toBe('expired');
  });
});

describe('bookingPatchFromPaymentStatus', () => {
  const now = '2026-01-01T00:00:00.000Z';

  it('returns confirmed patch for paid', () => {
    const patch = bookingPatchFromPaymentStatus('paid', now);
    expect(patch?.status).toBe('confirmed');
    expect(patch?.confirmed_at).toBe(now);
  });

  it('returns cancelled patch for expired', () => {
    const patch = bookingPatchFromPaymentStatus('expired', now);
    expect(patch?.status).toBe('cancelled');
  });

  it('returns cancelled patch for failed', () => {
    const patch = bookingPatchFromPaymentStatus('failed', now);
    expect(patch?.status).toBe('cancelled');
  });

  it('returns null for pending/refunded', () => {
    expect(bookingPatchFromPaymentStatus('pending', now)).toBeNull();
    expect(bookingPatchFromPaymentStatus('refunded', now)).toBeNull();
  });
});
