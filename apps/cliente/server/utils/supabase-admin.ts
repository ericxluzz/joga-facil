import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _adminClient: SupabaseClient | null = null;

export function createSupabaseAdmin() {
  if (_adminClient) return _adminClient;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios. Configure as variáveis de ambiente.',
    );
  }
  _adminClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: 'public' },
  });
  return _adminClient;
}

export function mapTenant(row: Record<string, any>) {
  return {
    id: row.id as string,
    slug: row.slug as string,
    name: row.name as string,
    timezone: (row.timezone as string) || 'America/Sao_Paulo',
    type: row.type as string,
    photoUrl: (row.photo_url as string | null) ?? null,
    address: (row.address as string | null) ?? null,
    settings: row.settings as any,
    plan: row.plan as string,
    status: row.status as string,
    trialEndsAt: row.trial_ends_at ? new Date(row.trial_ends_at as string) : null,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

export function mapBooking(row: Record<string, any>) {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    resourceId: row.resource_id as string,
    serviceId: row.service_id as string,
    customerId: (row.customer_id as string | null) ?? null,
    customerName: row.customer_name as string,
    customerPhone: row.customer_phone as string,
    customerEmail: (row.customer_email as string | null) ?? null,
    startsAt: new Date(row.starts_at as string),
    endsAt: new Date(row.ends_at as string),
    totalCents: row.total_cents as number,
    status: row.status as string,
    paymentMethod: row.payment_method as string,
    expiresAt: row.expires_at ? new Date(row.expires_at as string) : null,
    customerNotes: (row.customer_notes as string | null) ?? null,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
    confirmedAt: row.confirmed_at ? new Date(row.confirmed_at as string) : null,
    cancelledAt: row.cancelled_at ? new Date(row.cancelled_at as string) : null,
  };
}

export function mapResource(row: Record<string, any>) {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    name: row.name as string,
    type: row.type as string,
    photoUrl: (row.photo_url as string | null) ?? null,
    config: row.config as Record<string, any>,
    active: row.active as boolean,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

export function mapService(row: Record<string, any>) {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    resourceId: (row.resource_id as string | null) ?? null,
    name: row.name as string,
    description: (row.description as string | null) ?? null,
    durationMinutes: row.duration_minutes as number,
    basePriceCents: row.base_price_cents as number,
    active: row.active as boolean,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

export function mapPayment(row: Record<string, any>) {
  return {
    id: row.id as string,
    bookingId: row.booking_id as string,
    provider: row.provider as string,
    providerPaymentId: row.provider_payment_id as string,
    providerAccountId: (row.provider_account_id as string | null) ?? null,
    amountCents: row.amount_cents as number,
    sellerAmountCents: (row.seller_amount_cents as number | null) ?? null,
    platformFeeCents: (row.platform_fee_cents as number | null) ?? null,
    dueOnSiteCents: (row.due_on_site_cents as number | null) ?? null,
    status: row.status as string,
    pixQrCode: (row.pix_qr_code as string | null) ?? null,
    pixCopiaCola: (row.pix_copia_cola as string | null) ?? null,
    expiresAt: row.expires_at ? new Date(row.expires_at as string) : null,
    paidAt: row.paid_at ? new Date(row.paid_at as string) : null,
    rawPayload: row.raw_payload,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}
