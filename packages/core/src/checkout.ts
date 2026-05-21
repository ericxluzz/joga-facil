// Pure checkout calculation logic — no side effects, fully testable.
// Shared between apps/cliente and any future consumer.

export type CheckoutPaymentMethod = 'pix_upfront' | 'pay_on_site' | 'deposit_plus_on_site';

export type CheckoutAmounts = {
  totalCents: number;
  sellerAmountCents: number;
  platformFeeCents: number;
  dueNowCents: number;
  dueOnSiteCents: number;
  depositPercentage: number;
};

export type CheckoutSettings = {
  platformFeeCents?: number | null;
  depositPercentage?: number | null;
};

function toPositiveInt(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.round(parsed);
}

export function normalizeCheckoutMethod(method: unknown): CheckoutPaymentMethod {
  if (method === 'pix_upfront' || method === 'deposit_plus_on_site') return method;
  if (method === 'pay_on_site') return 'deposit_plus_on_site';
  return 'pix_upfront';
}

/**
 * Calculates the split amounts for a checkout session.
 * All inputs and outputs are in integer cents.
 *
 * @throws if totalCents is not enough to cover the platform fee
 */
export function calculateCheckoutAmounts(
  totalCents: number,
  bookingCount: number,
  method: CheckoutPaymentMethod,
  settings?: CheckoutSettings | null,
  envFallbacks?: { platformFeeCents?: string; depositPercentage?: string },
): CheckoutAmounts {
  const feePerBooking = toPositiveInt(
    settings?.platformFeeCents ?? envFallbacks?.platformFeeCents,
    500,
  );
  const depositPercentage = Math.min(
    toPositiveInt(settings?.depositPercentage ?? envFallbacks?.depositPercentage, 50),
    100,
  );

  const count = Math.max(bookingCount, 1);
  const platformFeeCents = feePerBooking * count;

  if (totalCents <= platformFeeCents) {
    throw new Error(
      `Valor do agendamento (${totalCents} centavos) precisa ser maior que a taxa da plataforma (${platformFeeCents} centavos).`,
    );
  }

  const sellerAmountCents =
    method === 'deposit_plus_on_site'
      ? Math.round((totalCents * depositPercentage) / 100)
      : totalCents;
  const dueOnSiteCents = Math.max(totalCents - sellerAmountCents, 0);

  return {
    totalCents,
    sellerAmountCents,
    platformFeeCents,
    dueNowCents: sellerAmountCents + platformFeeCents,
    dueOnSiteCents,
    depositPercentage,
  };
}
