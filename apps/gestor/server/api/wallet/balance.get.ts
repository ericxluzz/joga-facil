// GET /api/wallet/balance — returns available and pending balance from ValidaPay.
import { getActiveTenant } from '../../utils/tenant';
import { createSupabaseAdmin } from '../../utils/supabase-admin';
import { getBalance } from '../../utils/validapay/wallet';

export default defineEventHandler(async (event) => {
  const tenant = await getActiveTenant(event);
  if (!tenant) throw createError({ statusCode: 404, message: 'Tenant não encontrado' });

  const admin = await createSupabaseAdmin(event);
  const { data: account } = await admin
    .from('tenant_payment_accounts')
    .select('validapay_account_number, status')
    .eq('tenant_id', tenant.id)
    .maybeSingle();

  if (!account || account.status !== 'approved' || !account.validapay_account_number) {
    return { availableCents: 0, pendingCents: 0, kycApproved: false };
  }

  const balance = await getBalance(account.validapay_account_number);
  return { ...balance, kycApproved: true };
});
