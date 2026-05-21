// POST /api/payments/account — Create or update KYC draft for the current tenant.
import { getActiveTenant } from '../../utils/tenant';
import { createSupabaseAdmin } from '../../utils/supabase-admin';

export default defineEventHandler(async (event) => {
  const tenant = await getActiveTenant(event);
  if (!tenant) throw createError({ statusCode: 404, message: 'Tenant não encontrado' });

  const body = await readBody(event);
  const admin = await createSupabaseAdmin(event);

  // Check existing account
  const { data: existing } = await admin
    .from('tenant_payment_accounts')
    .select('id, status')
    .eq('tenant_id', tenant.id)
    .maybeSingle();

  // Prevent edits on approved/submitted accounts
  if (existing && ['approved', 'submitted', 'pending_review'].includes(existing.status)) {
    throw createError({
      statusCode: 409,
      message: `Não é possível editar uma conta com status "${existing.status}".`,
    });
  }

  const now = new Date().toISOString();
  const patch: Record<string, any> = {
    person_type: body.personType || 'PF',
    document: body.document || '',
    legal_name: body.legalName || '',
    trade_name: body.tradeName || null,
    birth_date: body.birthDate || null,
    email: body.email || '',
    phone: body.phone || '',
    address_street: body.address?.street || null,
    address_number: body.address?.number || null,
    address_complement: body.address?.complement || null,
    address_neighborhood: body.address?.neighborhood || null,
    address_city: body.address?.city || null,
    address_state: body.address?.state || null,
    address_zipcode: body.address?.zipcode || null,
    estimated_monthly_revenue_cents: body.estimatedMonthlyRevenueCents || null,
    updated_at: now,
    status: 'draft',
  };

  // PJ: representative fields
  if (body.personType === 'PJ') {
    patch.representative_name = body.representative?.name || null;
    patch.representative_document = body.representative?.document || null;
    patch.representative_birth_date = body.representative?.birthDate || null;
    patch.representative_email = body.representative?.email || null;
    patch.representative_phone = body.representative?.phone || null;
  }

  let accountId: string;
  if (existing) {
    await admin
      .from('tenant_payment_accounts')
      .update(patch)
      .eq('id', existing.id);
    accountId = existing.id;
  } else {
    const { data: created, error } = await admin
      .from('tenant_payment_accounts')
      .insert({ tenant_id: tenant.id, ...patch })
      .select('id')
      .single();
    if (error) throw createError({ statusCode: 500, message: error.message });
    accountId = created!.id;
  }

  return { ok: true, id: accountId, status: 'draft' };
});
