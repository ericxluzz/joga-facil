// GET /api/admin/payments — Global payments list.
import { createSupabaseAdmin } from '../../utils/supabase-admin';

export default defineEventHandler(async (event) => {
  const admin = await createSupabaseAdmin(event);
  const query = getQuery(event);
  const limit = Math.min(Number(query.limit) || 100, 500);

  const { data: rows } = await admin
    .from('payments')
    .select(`
      id, provider_payment_id, amount_cents, platform_fee_cents, status, created_at,
      bookings!inner(tenant_id, tenants!inner(name))
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  const payments = (rows || []).map((p: any) => ({
    id: p.id,
    providerPaymentId: p.provider_payment_id,
    amountCents: p.amount_cents,
    platformFeeCents: p.platform_fee_cents,
    status: p.status,
    createdAt: p.created_at,
    tenantName: p.bookings?.tenants?.name ?? 'N/A',
  }));

  return { payments };
});
