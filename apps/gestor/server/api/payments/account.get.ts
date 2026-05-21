// GET /api/payments/account — Returns the KYC account state for the current tenant.
import { getActiveTenant } from '../../utils/tenant';
import { createSupabaseAdmin } from '../../utils/supabase-admin';

export default defineEventHandler(async (event) => {
  const tenant = await getActiveTenant(event);
  if (!tenant) throw createError({ statusCode: 404, message: 'Tenant não encontrado' });

  const admin = await createSupabaseAdmin(event);
  const { data: account } = await admin
    .from('tenant_payment_accounts')
    .select('*, tenant_payment_documents(*)')
    .eq('tenant_id', tenant.id)
    .maybeSingle();

  if (!account) {
    return {
      status: 'not_started',
      personType: null,
      documents: [],
    };
  }

  return {
    id: account.id,
    status: account.status,
    personType: account.person_type,
    document: account.document,
    legalName: account.legal_name,
    tradeName: account.trade_name,
    birthDate: account.birth_date,
    email: account.email,
    phone: account.phone,
    address: {
      street: account.address_street,
      number: account.address_number,
      complement: account.address_complement,
      neighborhood: account.address_neighborhood,
      city: account.address_city,
      state: account.address_state,
      zipcode: account.address_zipcode,
    },
    representative: account.person_type === 'PJ'
      ? {
          name: account.representative_name,
          document: account.representative_document,
          birthDate: account.representative_birth_date,
          email: account.representative_email,
          phone: account.representative_phone,
        }
      : null,
    validapayFormId: account.validapay_form_id,
    validapayAccountNumber: account.validapay_account_number,
    rejectionReason: account.rejection_reason,
    submittedAt: account.submitted_at,
    approvedAt: account.approved_at,
    rejectedAt: account.rejected_at,
    documents: (account.tenant_payment_documents || []).map((d: any) => ({
      id: d.id,
      documentType: d.document_type,
      fileUrl: d.file_url,
      status: d.status,
      createdAt: d.created_at,
    })),
  };
});
