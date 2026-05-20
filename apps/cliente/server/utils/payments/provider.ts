import { createPixCharge as createAbacatePixCharge, mapAbacateStatus } from '../abacate';
import type { CreateProviderPixChargeInput, ProviderPixCharge } from './types';

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function centsToDecimal(cents: number): number {
  return Math.round(cents) / 100;
}

function getValidapayBaseUrl(): string {
  const explicitBase = process.env.VALIDAPAY_API_BASE_URL;
  if (explicitBase) return explicitBase.replace(/\/$/, '');
  return process.env.VALIDAPAY_ENV === 'production'
    ? 'https://api.validapay.com.br'
    : 'https://sandbox.validapay.com.br';
}

async function getValidapayToken(): Promise<string> {
  if (process.env.VALIDAPAY_ACCESS_TOKEN) return process.env.VALIDAPAY_ACCESS_TOKEN;

  const clientId = process.env.VALIDAPAY_CLIENT_ID;
  const clientSecret = process.env.VALIDAPAY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw createError({
      statusCode: 500,
      message: 'ValidaPay sem credenciais. Configure VALIDAPAY_ACCESS_TOKEN ou CLIENT_ID/CLIENT_SECRET.',
    });
  }

  const res = await fetch(`${getValidapayBaseUrl()}/auth/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ clientId, clientSecret }),
  });

  if (!res.ok) {
    throw createError({
      statusCode: 502,
      message: `ValidaPay auth erro ${res.status}: ${await res.text()}`,
    });
  }

  const json = toRecord(await res.json());
  const token = asString(json.access_token) || asString(json.accessToken) || asString(json.token);
  if (!token) {
    throw createError({ statusCode: 502, message: 'ValidaPay auth sem token na resposta.' });
  }
  return token;
}

export function mapValidapayStatus(status: unknown): ProviderPixCharge['status'] {
  const normalized = String(status || '').toUpperCase();
  if (['PAID', 'CONFIRMED', 'COMPLETED', 'SUCCESS', 'APPROVED'].includes(normalized)) {
    return 'paid';
  }
  if (['EXPIRED', 'CANCELLED'].includes(normalized)) return 'expired';
  if (['REFUNDED', 'REFUND'].includes(normalized)) return 'refunded';
  if (['FAILED', 'REJECTED', 'ERROR'].includes(normalized)) return 'failed';
  return 'pending';
}

async function createValidapayPixCharge(
  input: CreateProviderPixChargeInput,
): Promise<ProviderPixCharge> {
  const token = await getValidapayToken();

  const payload = {
    value: centsToDecimal(input.amountCents),
    description: input.description,
    expiresIn: input.expiresInSeconds,
    customer: {
      name: input.customer.name,
      phoneNumber: input.customer.phone.replace(/\D/g, ''),
      email: input.customer.email,
      documentNumber: input.customer.taxId,
    },
    split: {
      type: 'fixed',
      fixedValue: centsToDecimal(input.platformFeeCents),
      destination: 'master',
    },
    metadata: input.metadata,
  };

  const headers: Record<string, string> = {
    authorization: `Bearer ${token}`,
    'content-type': 'application/json',
  };
  if (input.providerAccountId) headers.accountId = input.providerAccountId;

  const res = await fetch(`${getValidapayBaseUrl()}/v1/charges/pix`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw createError({
      statusCode: 502,
      message: `ValidaPay erro ${res.status}: ${await res.text()}`,
    });
  }

  const json = await res.json();
  const data = toRecord(toRecord(json).data || json);
  const providerPaymentId =
    asString(data.id) ||
    asString(data.chargeId) ||
    asString(data.charge_id) ||
    asString(data.uuid);
  if (!providerPaymentId) {
    throw createError({ statusCode: 502, message: 'ValidaPay sem id da cobrança na resposta.' });
  }

  const expiresAt = asString(data.expiresAt) || asString(data.expirationDate);

  return {
    provider: 'validapay',
    providerPaymentId,
    providerAccountId: input.providerAccountId ?? null,
    amountCents:
      asNumber(data.amountCents) ??
      asNumber(data.amount) ??
      Math.round((asNumber(data.value) ?? centsToDecimal(input.amountCents)) * 100),
    status: mapValidapayStatus(data.status),
    pixQrCode:
      asString(data.qrCodeBase64) ||
      asString(data.brCodeBase64) ||
      asString(data.pixQrCode) ||
      null,
    pixCopiaCola:
      asString(data.brCode) ||
      asString(data.copyPaste) ||
      asString(data.pixCopiaCola) ||
      asString(data.payload) ||
      null,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
    rawPayload: json,
  };
}

export async function createProviderPixCharge(
  input: CreateProviderPixChargeInput,
): Promise<ProviderPixCharge> {
  if (input.provider === 'validapay') {
    return createValidapayPixCharge(input);
  }

  const charge = await createAbacatePixCharge({
    amount: input.amountCents,
    expiresIn: input.expiresInSeconds,
    description: input.description,
    customer: {
      name: input.customer.name,
      cellphone: input.customer.phone.replace(/\D/g, ''),
      email: input.customer.email,
      taxId: input.customer.taxId,
    },
    metadata: input.metadata,
  });

  return {
    provider: 'abacatepay',
    providerPaymentId: charge.id,
    providerAccountId: null,
    amountCents: charge.amount,
    status: mapAbacateStatus(charge.status),
    pixQrCode: charge.brCodeBase64,
    pixCopiaCola: charge.brCode,
    expiresAt: new Date(charge.expiresAt),
    rawPayload: charge,
  };
}
