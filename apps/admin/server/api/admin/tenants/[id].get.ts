import { createSupabaseAdmin } from '../../../utils/supabase-admin';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  if (!id) throw createError({ statusCode: 400, message: 'id obrigatório' });

  const admin = await createSupabaseAdmin(event);
  const { data: tenant } = await admin
    .from('tenants')
    .select('*, tenant_payment_accounts(status)')
    .eq('id', id)
    .single();

  if (!tenant) throw createError({ statusCode: 404, message: 'Arena não encontrada' });

  return {
    tenant: {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      plan: tenant.plan,
      status: tenant.status,
      createdAt: tenant.created_at,
    },
    kycStatus: (tenant as any).tenant_payment_accounts?.[0]?.status ?? null,
  };
});
