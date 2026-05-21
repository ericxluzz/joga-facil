// GET /api/wallet/transactions?from=&to=&type= — paginated transaction history.
import { getActiveTenant } from '../../utils/tenant';
import { createSupabaseAdmin } from '../../utils/supabase-admin';
import { getTransactions } from '../../utils/validapay/wallet';

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
    return { transactions: [], kycApproved: false };
  }

  const query = getQuery(event);
  const transactions = await getTransactions(account.validapay_account_number, {
    from: query.from as string | undefined,
    to: query.to as string | undefined,
    type: query.type as string | undefined,
  });

  return { transactions, kycApproved: true };
});
