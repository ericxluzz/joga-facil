// POST /api/wallet/withdrawals — request a withdrawal from ValidaPay.
import { getActiveTenant } from '../../utils/tenant';
import { createSupabaseAdmin } from '../../utils/supabase-admin';
import { getBalance, requestWithdrawal } from '../../utils/validapay/wallet';

export default defineEventHandler(async (event) => {
  const tenant = await getActiveTenant(event);
  if (!tenant) throw createError({ statusCode: 404, message: 'Tenant não encontrado' });

  const body = await readBody(event);
  const amountCents = Number(body?.amountCents);
  if (!amountCents || amountCents <= 0 || !Number.isInteger(amountCents)) {
    throw createError({ statusCode: 400, message: 'amountCents deve ser um inteiro positivo.' });
  }

  const admin = await createSupabaseAdmin(event);
  const { data: account } = await admin
    .from('tenant_payment_accounts')
    .select('id, validapay_account_number, status')
    .eq('tenant_id', tenant.id)
    .maybeSingle();

  if (!account || account.status !== 'approved' || !account.validapay_account_number) {
    throw createError({ statusCode: 409, message: 'Conta não aprovada. Conclua o cadastro KYC primeiro.' });
  }

  // Check available balance
  const balance = await getBalance(account.validapay_account_number);
  if (amountCents > balance.availableCents) {
    throw createError({
      statusCode: 422,
      message: `Saldo insuficiente. Disponível: R$ ${(balance.availableCents / 100).toFixed(2)}.`,
    });
  }

  const MIN_WITHDRAWAL_CENTS = 100; // R$ 1,00
  if (amountCents < MIN_WITHDRAWAL_CENTS) {
    throw createError({ statusCode: 422, message: 'Valor mínimo de saque: R$ 1,00.' });
  }

  // Create withdrawal record
  const now = new Date().toISOString();
  const { data: withdrawal, error: dbErr } = await admin
    .from('withdrawals')
    .insert({
      tenant_id: tenant.id,
      account_id: account.id,
      amount_cents: amountCents,
      status: 'requested',
      requested_at: now,
      updated_at: now,
    })
    .select('id')
    .single();

  if (dbErr) throw createError({ statusCode: 500, message: dbErr.message });

  // Send to ValidaPay
  try {
    const vpRes = await requestWithdrawal(account.validapay_account_number, amountCents);
    const providerId =
      (vpRes as any)?.withdrawalId ||
      (vpRes as any)?.withdrawal_id ||
      (vpRes as any)?.id ||
      null;

    await admin.from('withdrawals').update({
      status: 'processing',
      provider_withdrawal_id: providerId,
      provider_payload: vpRes,
      updated_at: new Date().toISOString(),
    }).eq('id', withdrawal!.id);

    return { ok: true, withdrawalId: withdrawal!.id, status: 'processing' };
  } catch (err: any) {
    // Rollback to failed
    await admin.from('withdrawals').update({
      status: 'failed',
      failure_reason: err?.message || 'Erro ao processar',
      updated_at: new Date().toISOString(),
    }).eq('id', withdrawal!.id);

    throw createError({ statusCode: 502, message: err?.message || 'Erro ao solicitar saque.' });
  }
});
