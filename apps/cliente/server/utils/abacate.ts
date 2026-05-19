// Cliente AbacatePay — APENAS server-side. A chave NUNCA é exposta ao browser.
// Doc: https://docs.abacatepay.com/

const API_BASE_DEV = 'https://api.abacatepay.com/v1';
const API_BASE_PROD = 'https://api.abacatepay.com/v1';

function getConfig() {
  const apiKey = process.env.ABACATEPAY_API_KEY;
  if (!apiKey) {
    throw new Error('ABACATEPAY_API_KEY não configurada no .env');
  }
  const base = process.env.ABACATEPAY_ENV === 'production' ? API_BASE_PROD : API_BASE_DEV;
  return { apiKey, base };
}

type AbacateRequest = {
  amount: number; // centavos
  expiresIn?: number; // segundos
  description: string;
  customer: {
    name: string;
    cellphone: string;
    email?: string;
    taxId?: string;
  };
  metadata?: Record<string, any>;
};

export type PixCharge = {
  id: string;
  amount: number;
  status: 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED' | 'REFUNDED';
  brCode: string; // copia-cola
  brCodeBase64: string; // QR code base64
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
};

export async function createPixCharge(payload: AbacateRequest): Promise<PixCharge> {
  const { apiKey, base } = getConfig();

  const res = await fetch(`${base}/pixQrCode/create`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      amount: payload.amount,
      expiresIn: payload.expiresIn || 15 * 60,
      description: payload.description,
      customer: {
        name: payload.customer.name,
        cellphone: payload.customer.cellphone,
        email: payload.customer.email || `${Date.now()}@noemail.local`,
        taxId: payload.customer.taxId || '00000000000',
      },
      metadata: payload.metadata,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw createError({
      statusCode: 502,
      message: `AbacatePay erro ${res.status}: ${text}`,
    });
  }

  const json = (await res.json()) as any;
  // Estrutura esperada: { data: { id, amount, status, brCode, brCodeBase64, ... } }
  const data = json.data || json;
  return data as PixCharge;
}

export async function getPixCharge(id: string): Promise<PixCharge> {
  const { apiKey, base } = getConfig();

  const res = await fetch(`${base}/pixQrCode/check?id=${encodeURIComponent(id)}`, {
    method: 'GET',
    headers: {
      authorization: `Bearer ${apiKey}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw createError({
      statusCode: 502,
      message: `AbacatePay erro ${res.status}: ${text}`,
    });
  }

  const json = (await res.json()) as any;
  return (json.data || json) as PixCharge;
}

// Mapeia status do AbacatePay → status interno do payment
export function mapAbacateStatus(s: PixCharge['status']):
  | 'pending'
  | 'paid'
  | 'expired'
  | 'refunded'
  | 'failed' {
  switch (s) {
    case 'PAID':
      return 'paid';
    case 'EXPIRED':
      return 'expired';
    case 'REFUNDED':
      return 'refunded';
    case 'CANCELLED':
      return 'failed';
    default:
      return 'pending';
  }
}
