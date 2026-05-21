// GET /api/admin/tenants — List all tenants with KYC status.
import { createSupabaseAdmin } from '../../utils/supabase-admin';

export default defineEventHandler(async (event) => {
  const admin = await createSupabaseAdmin(event);

  const { data: rows } = await admin
    .from('tenants')
    .select('id, slug, name, plan, status, created_at, tenant_payment_accounts(status)')
    .order('created_at', { ascending: false });

  const tenants = (rows || []).map((t: any) => ({
    id: t.id,
    slug: t.slug,
    name: t.name,
    plan: t.plan,
    status: t.status,
    kycStatus: t.tenant_payment_accounts?.[0]?.status ?? null,
    createdAt: t.created_at,
  }));

  return { tenants };
});
