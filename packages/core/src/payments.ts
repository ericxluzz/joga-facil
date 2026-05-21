// Pure payment / webhook logic — no side effects, fully testable.

export type PaymentStatus = 'pending' | 'paid' | 'expired' | 'failed' | 'refunded';

/** Map of ValidaPay raw status strings → internal status. */
export function mapValidapayStatus(status: unknown): PaymentStatus {
  const s = String(status ?? '').toUpperCase();
  if (['PAID', 'CONFIRMED', 'COMPLETED', 'SUCCESS', 'APPROVED'].includes(s)) return 'paid';
  if (['EXPIRED', 'CANCELLED'].includes(s)) return 'expired';
  if (['REFUNDED', 'REFUND'].includes(s)) return 'refunded';
  if (['FAILED', 'REJECTED', 'ERROR'].includes(s)) return 'failed';
  return 'pending';
}

/**
 * Given a list of payment rows sharing a charge ID, determines the new status
 * from a webhook payload. Returns null if the status is unknown/unchanged.
 */
export function resolveWebhookStatus(
  rawStatus: unknown,
  currentStatus: PaymentStatus,
): PaymentStatus | null {
  if (!rawStatus) return null;
  const resolved = mapValidapayStatus(rawStatus);
  if (resolved === currentStatus) return null; // no change
  return resolved;
}

/** Builds the booking update patch from a resolved payment status. */
export function bookingPatchFromPaymentStatus(
  status: PaymentStatus,
  now: string,
): Record<string, string> | null {
  if (status === 'paid') {
    return { status: 'confirmed', confirmed_at: now, updated_at: now };
  }
  if (status === 'expired' || status === 'failed') {
    return { status: 'cancelled', cancelled_at: now, updated_at: now };
  }
  return null;
}
