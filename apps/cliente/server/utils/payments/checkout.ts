import type { TenantSettings } from '@agendaslim/db/schema';
import type { CheckoutAmounts, CheckoutPaymentMethod, PaymentProviderName } from './types';

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

export function getPaymentProvider(settings?: Partial<TenantSettings> | null): PaymentProviderName {
  const raw = settings?.paymentProvider || process.env.PAYMENT_PROVIDER || 'abacatepay';
  return raw === 'validapay' ? 'validapay' : 'abacatepay';
}

export function getProviderAccountId(
  provider: PaymentProviderName,
  settings?: Partial<TenantSettings> | null,
): string | undefined {
  if (provider !== 'validapay') return undefined;
  return settings?.validapayAccountId || process.env.VALIDAPAY_DEFAULT_ACCOUNT_ID || undefined;
}

export function calculateCheckoutAmounts(
  totalCents: number,
  bookingCount: number,
  method: CheckoutPaymentMethod,
  settings?: Partial<TenantSettings> | null,
): CheckoutAmounts {
  const feePerBooking = toPositiveInt(
    settings?.platformFeeCents ?? process.env.PLATFORM_FEE_CENTS,
    500,
  );
  const depositPercentage = Math.min(
    toPositiveInt(settings?.depositPercentage ?? process.env.DEPOSIT_PERCENTAGE, 50),
    100,
  );

  const platformFeeCents = feePerBooking * Math.max(bookingCount, 1);
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
