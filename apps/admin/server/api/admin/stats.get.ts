// GET /api/admin/stats — Platform dashboard metrics.
import { createSupabaseAdmin } from '../../utils/supabase-admin';

export default defineEventHandler(async (event) => {
  const admin = await createSupabaseAdmin(event);

  const [
    { count: totalTenants },
    { count: approvedAccounts },
    { count: pendingAccounts },
    { data: paymentAgg },
  ] = await Promise.all([
    admin.from('tenants').select('id', { count: 'exact', head: true }),
    admin.from('tenant_payment_accounts').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
    admin.from('tenant_payment_accounts').select('id', { count: 'exact', head: true }).in('status', ['submitted', 'pending_review']),
    admin.from('payments').select('amount_cents, platform_fee_cents, status'),
  ]);

  const payments = paymentAgg || [];
  const paidPayments = payments.filter((p: any) => p.status === 'paid');
  const gmvCents = paidPayments.reduce((s: number, p: any) => s + (p.amount_cents || 0), 0);
  const platformFeeCents = paidPayments.reduce((s: number, p: any) => s + (p.platform_fee_cents || 0), 0);

  return {
    totalTenants: totalTenants ?? 0,
    approvedAccounts: approvedAccounts ?? 0,
    pendingAccounts: pendingAccounts ?? 0,
    totalPayments: paidPayments.length,
    gmvCents,
    platformFeeCents,
  };
});
