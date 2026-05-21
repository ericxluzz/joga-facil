// POST /api/payments/account/submit — Submit KYC to ValidaPay (creates proposal).
import { getActiveTenant } from '../../../utils/tenant';
import { createSupabaseAdmin } from '../../../utils/supabase-admin';
import { createSubaccountProposal, extractFormId } from '../../../utils/validapay/subaccount';
import { accountToProposal } from '../../../utils/validapay/mappers';

export default defineEventHandler(async (event) => {
  const tenant = await getActiveTenant(event);
  if (!tenant) throw createError({ statusCode: 404, message: 'Tenant não encontrado' });

  const admin = await createSupabaseAdmin(event);

  const { data: account, error: accountErr } = await admin
    .from('tenant_payment_accounts')
    .select('*, tenant_payment_documents(*)')
    .eq('tenant_id', tenant.id)
    .maybeSingle();

  if (accountErr) throw createError({ statusCode: 500, message: accountErr.message });
  if (!account) throw createError({ statusCode: 404, message: 'Cadastro financeiro não encontrado.' });
  if (account.status === 'approved') {
    return { ok: true, alreadyApproved: true };
  }
  if (account.status === 'submitted' || account.status === 'pending_review') {
    throw createError({ statusCode: 409, message: 'Proposta já enviada. Aguarde a revisão.' });
  }

  // Validate required fields
  const missing: string[] = [];
  if (!account.document) missing.push('document');
  if (!account.legal_name) missing.push('legalName');
  if (!account.email) missing.push('email');
  if (!account.phone) missing.push('phone');
  if (!account.address_street) missing.push('address.street');
  if (!account.address_city) missing.push('address.city');
  if (!account.address_state) missing.push('address.state');
  if (!account.address_zipcode) missing.push('address.zipcode');
  if (account.person_type === 'PF' && !account.birth_date) missing.push('birthDate');
  if (account.person_type === 'PJ') {
    if (!account.representative_name) missing.push('representative.name');
    if (!account.representative_document) missing.push('representative.document');
  }

  if (missing.length > 0) {
    throw createError({
      statusCode: 422,
      message: `Campos obrigatórios ausentes: ${missing.join(', ')}`,
    });
  }

  const docs = (account.tenant_payment_documents || []).map((d: any) => ({
    documentType: d.document_type,
    fileUrl: d.file_url,
  }));

  const webhookUrl = `${process.env.NUXT_PUBLIC_APP_URL || process.env.BASE_URL || ''}/api/webhooks/validapay`;

  // Build proposal from account row (types match TenantPaymentAccount)
  const accountMapped = {
    ...account,
    id: account.id,
    tenantId: account.tenant_id,
    personType: account.person_type,
    legalName: account.legal_name,
    tradeName: account.trade_name,
    birthDate: account.birth_date,
    addressStreet: account.address_street,
    addressNumber: account.address_number,
    addressComplement: account.address_complement,
    addressNeighborhood: account.address_neighborhood,
    addressCity: account.address_city,
    addressState: account.address_state,
    addressZipcode: account.address_zipcode,
    representativeName: account.representative_name,
    representativeDocument: account.representative_document,
    representativeBirthDate: account.representative_birth_date,
    representativeEmail: account.representative_email,
    representativePhone: account.representative_phone,
    estimatedMonthlyRevenueCents: account.estimated_monthly_revenue_cents,
    validapayFormId: account.validapay_form_id,
    validapayAccountNumber: account.validapay_account_number,
    validapayStatusRaw: account.validapay_status_raw,
    rejectionReason: account.rejection_reason,
    submittedAt: account.submitted_at,
    approvedAt: account.approved_at,
    rejectedAt: account.rejected_at,
    createdAt: account.created_at,
    updatedAt: account.updated_at,
  } as any;

  const proposal = accountToProposal(accountMapped, docs, webhookUrl);
  const response = await createSubaccountProposal(proposal);
  const formId = extractFormId(response);

  const now = new Date().toISOString();
  await admin
    .from('tenant_payment_accounts')
    .update({
      status: 'submitted',
      validapay_form_id: formId || account.validapay_form_id,
      submitted_at: now,
      updated_at: now,
    })
    .eq('id', account.id);

  return {
    ok: true,
    formId,
    status: 'submitted',
  };
});
