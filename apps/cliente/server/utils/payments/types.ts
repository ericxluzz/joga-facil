import type { PaymentStatus } from '@agendaslim/db/schema';

export type PaymentProviderName = 'validapay';

export type CheckoutPaymentMethod =
  | 'pix_upfront'
  | 'pay_on_site'
  | 'deposit_plus_on_site';

export type PaymentCustomer = {
  name: string;
  phone: string;
  email?: string;
  taxId?: string;
};

export type CreateProviderPixChargeInput = {
  providerAccountId?: string;
  amountCents: number;
  sellerAmountCents: number;
  platformFeeCents: number;
  dueOnSiteCents: number;
  expiresInSeconds: number;
  description: string;
  customer: PaymentCustomer;
  metadata: Record<string, unknown>;
};

export type ProviderPixCharge = {
  providerPaymentId: string;
  providerAccountId?: string | null;
  amountCents: number;
  status: PaymentStatus;
  pixQrCode?: string | null;
  pixCopiaCola?: string | null;
  expiresAt?: Date | null;
  rawPayload: unknown;
};

export type CheckoutAmounts = {
  totalCents: number;
  sellerAmountCents: number;
  platformFeeCents: number;
  dueNowCents: number;
  dueOnSiteCents: number;
  depositPercentage: number;
};
