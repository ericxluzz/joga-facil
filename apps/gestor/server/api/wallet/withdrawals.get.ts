// GET /api/wallet/withdrawals — list withdrawal history for current tenant.
import { getActiveTenant } from '../../utils/tenant';
import { createSupabaseAdmin } from '../../utils/supabase-admin';

export default defineEventHandler(async (event) => {
  const tenant = await getActiveTenant(event);
  if (!tenant) throw createError({ statusCode: 404, message: 'Tenant não encontrado' });

  const admin = await createSupabaseAdmin(event);
  const { data: rows } = await admin
    .from('withdrawals')
    .select('*')
    .eq('tenant_id', tenant.id)
    .order('requested_at', { ascending: false })
    .limit(50);

  return {
    withdrawals: (rows || []).map((r: any) => ({
      id: r.id,
      amountCents: r.amount_cents,
      status: r.status,
      providerWithdrawalId: r.provider_withdrawal_id,
      failureReason: r.failure_reason,
      requestedAt: r.requested_at,
      completedAt: r.completed_at,
    })),
  };
});
