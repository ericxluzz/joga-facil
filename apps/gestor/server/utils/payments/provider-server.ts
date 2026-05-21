// Server-side payment utilities for the gestor app.
// Re-implements the ValidaPay charge status lookup.
import { vpFetch } from '../validapay/client';

export type ChargeStatus = 'pending' | 'paid' | 'expired' | 'failed' | 'refunded';

function mapValidapayStatus(status: unknown): ChargeStatus {
  const s = String(status || '').toUpperCase();
  if (['PAID', 'CONFIRMED', 'COMPLETED', 'SUCCESS', 'APPROVED'].includes(s)) return 'paid';
  if (['EXPIRED', 'CANCELLED'].includes(s)) return 'expired';
  if (['REFUNDED', 'REFUND'].includes(s)) return 'refunded';
  if (['FAILED', 'REJECTED', 'ERROR'].includes(s)) return 'failed';
  return 'pending';
}

export async function getValidapayChargeStatus(chargeId: string): Promise<{
  status: ChargeStatus;
  rawPayload: unknown;
} | null> {
  try {
    const json = await vpFetch<Record<string, unknown>>(
      `/v1/charges/${encodeURIComponent(chargeId)}`,
    );
    const data = (json?.data as Record<string, unknown>) || json;
    return {
      status: mapValidapayStatus(data?.status),
      rawPayload: json,
    };
  } catch {
    return null;
  }
}
