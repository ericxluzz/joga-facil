// Re-exports from @agendaslim/core plus app-specific helpers.
export {
  calculateCheckoutAmounts,
  normalizeCheckoutMethod,
  type CheckoutAmounts,
  type CheckoutPaymentMethod,
} from '@agendaslim/core';

/** Looks up the tenant's approved ValidaPay account number from DB first, env fallback for dev. */
export async function getValidapayAccountNumber(
  tenantId: string,
  supabaseAdmin: { from: (table: string) => any },
): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('tenant_payment_accounts')
    .select('validapay_account_number, status')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (data?.status === 'approved' && data.validapay_account_number) {
    return data.validapay_account_number as string;
  }

  // Dev/sandbox fallback — not for production
  return process.env.VALIDAPAY_DEFAULT_ACCOUNT_ID || null;
}
