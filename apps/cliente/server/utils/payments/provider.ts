// ValidaPay payment provider — server-side only.
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

// Simple in-memory token cache (reuses token until 5 min before expiry).
let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function getValidapayToken(): Promise<string> {
  if (process.env.VALIDAPAY_ACCESS_TOKEN) return process.env.VALIDAPAY_ACCESS_TOKEN;

  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt) return cachedToken;

  const clientId = process.env.VALIDAPAY_CLIENT_ID;
  const clientSecret = process.env.VALIDAPAY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw createError({
      statusCode: 500,
      message: 'ValidaPay sem credenciais. Configure VALIDAPAY_CLIENT_ID e VALIDAPAY_CLIENT_SECRET.',
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

  // Cache for (expires_in - 5 min) seconds, defaulting to 50 min.
  const expiresIn = asNumber(json.expires_in) ?? asNumber(json.expiresIn) ?? 3600;
  cachedToken = token;
  tokenExpiresAt = now + (expiresIn - 300) * 1000;
  return token;
}

export function mapValidapayStatus(status: unknown): ProviderPixCharge['status'] {
  const normalized = String(status || '').toUpperCase();
  if (['PAID', 'CONFIRMED', 'COMPLETED', 'SUCCESS', 'APPROVED'].includes(normalized)) return 'paid';
  if (['EXPIRED', 'CANCELLED'].includes(normalized)) return 'expired';
  if (['REFUNDED', 'REFUND'].includes(normalized)) return 'refunded';
  if (['FAILED', 'REJECTED', 'ERROR'].includes(normalized)) return 'failed';
  return 'pending';
}

export async function createProviderPixCharge(
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

/** GET /v1/charges/:id — query payment status from ValidaPay. */
export async function getValidapayChargeStatus(chargeId: string): Promise<ProviderPixCharge | null> {
  try {
    const token = await getValidapayToken();
    const res = await fetch(`${getValidapayBaseUrl()}/v1/charges/${encodeURIComponent(chargeId)}`, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const data = toRecord(toRecord(json).data || json);
    const id =
      asString(data.id) ||
      asString(data.chargeId) ||
      asString(data.charge_id) ||
      asString(data.uuid) ||
      chargeId;
    const expiresAt = asString(data.expiresAt) || asString(data.expirationDate);
    return {
      providerPaymentId: id,
      providerAccountId: asString(data.accountId) ?? null,
      amountCents: asNumber(data.amountCents) ?? asNumber(data.amount) ?? 0,
      status: mapValidapayStatus(data.status),
      pixQrCode: null,
      pixCopiaCola: null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      rawPayload: json,
    };
  } catch {
    return null;
  }
}
