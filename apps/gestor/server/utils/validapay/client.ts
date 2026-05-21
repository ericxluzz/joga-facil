// ValidaPay HTTP client — OAuth2 with in-process token cache.
import type { TokenResponse } from './types';

interface CachedToken {
  token: string;
  expiresAt: number; // ms timestamp
}

let cache: CachedToken | null = null;

export function getBaseUrl(): string {
  const explicit = process.env.VALIDAPAY_API_BASE_URL;
  if (explicit) return explicit.replace(/\/$/, '');
  return process.env.VALIDAPAY_ENV === 'production'
    ? 'https://api.validapay.com.br'
    : 'https://sandbox.validapay.com.br';
}

export async function getToken(): Promise<string> {
  if (process.env.VALIDAPAY_ACCESS_TOKEN) return process.env.VALIDAPAY_ACCESS_TOKEN;

  const now = Date.now();
  if (cache && now < cache.expiresAt) return cache.token;

  const clientId = process.env.VALIDAPAY_CLIENT_ID;
  const clientSecret = process.env.VALIDAPAY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw createError({
      statusCode: 500,
      message: 'VALIDAPAY_CLIENT_ID e VALIDAPAY_CLIENT_SECRET são obrigatórios.',
    });
  }

  const res = await fetch(`${getBaseUrl()}/auth/token`, {
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

  const json = (await res.json()) as TokenResponse;
  const token = json.access_token || json.accessToken || json.token;
  if (!token) {
    throw createError({ statusCode: 502, message: 'ValidaPay auth: token ausente na resposta.' });
  }

  const expiresIn = json.expires_in ?? json.expiresIn ?? 3600;
  cache = { token, expiresAt: now + (expiresIn - 300) * 1000 };
  return token;
}

/** Generic authenticated request helper. */
export async function vpFetch<T = unknown>(
  path: string,
  options: RequestInit & { accountNumber?: string } = {},
): Promise<T> {
  const token = await getToken();
  const { accountNumber, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    authorization: `Bearer ${token}`,
    'content-type': 'application/json',
    ...(fetchOptions.headers as Record<string, string> | undefined),
  };
  if (accountNumber) headers.accountId = accountNumber;

  const res = await fetch(`${getBaseUrl()}${path}`, { ...fetchOptions, headers });

  if (!res.ok) {
    const body = await res.text();
    throw createError({
      statusCode: res.status >= 500 ? 502 : res.status,
      message: `ValidaPay ${path} erro ${res.status}: ${body}`,
    });
  }

  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}
