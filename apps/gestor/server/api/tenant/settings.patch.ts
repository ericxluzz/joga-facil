import { getActiveTenant } from '../../utils/tenant';
import { createSupabaseAdmin } from '../../utils/supabase-admin';

// PATCH /api/tenant/settings — Atualiza as configurações (settings) do tenant
export default defineEventHandler(async (event) => {
  const tenant = await getActiveTenant(event);
  if (!tenant) {
    throw createError({ statusCode: 404, message: 'Estabelecimento não encontrado' });
  }

  const body = await readBody(event);
  const admin = await createSupabaseAdmin(event);

  const updatedSettings = {
    ...(tenant.settings || {}),
    // Reserva
    requireRegistration: body.requireRegistration ?? tenant.settings?.requireRegistration ?? false,
    acceptPayOnSite: body.acceptPayOnSite ?? tenant.settings?.acceptPayOnSite ?? false,
    minAdvanceMinutes: body.minAdvanceMinutes ?? tenant.settings?.minAdvanceMinutes ?? 60,
    maxAdvanceDays: body.maxAdvanceDays ?? tenant.settings?.maxAdvanceDays ?? 30,
    holdMinutes: body.holdMinutes ?? tenant.settings?.holdMinutes ?? 10,
    payOnSiteTimeoutMinutes: body.payOnSiteTimeoutMinutes ?? tenant.settings?.payOnSiteTimeoutMinutes ?? 60,
    cancellationPolicy: body.cancellationPolicy ?? tenant.settings?.cancellationPolicy ?? '',
    // Pagamentos
    ...(body.paymentProvider !== undefined && { paymentProvider: body.paymentProvider }),
    ...(body.validapayAccountId !== undefined && { validapayAccountId: body.validapayAccountId }),
    ...(body.platformFeeCents !== undefined && { platformFeeCents: Number(body.platformFeeCents) }),
    ...(body.depositPercentage !== undefined && { depositPercentage: Number(body.depositPercentage) }),
    ...(body.paymentOnboardingStatus !== undefined && { paymentOnboardingStatus: body.paymentOnboardingStatus }),
    // Branding
    ...(body.description !== undefined && { description: body.description }),
    ...(body.whatsapp !== undefined && { whatsapp: body.whatsapp }),
    ...(body.instagram !== undefined && { instagram: body.instagram }),
  };

  const { data: updated, error } = await admin
    .from('tenants')
    .update({ settings: updatedSettings, updated_at: new Date().toISOString() })
    .eq('id', tenant.id)
    .select('settings')
    .single();

  if (error) throw createError({ statusCode: 500, message: error.message });
  return { settings: updated!.settings };
});
