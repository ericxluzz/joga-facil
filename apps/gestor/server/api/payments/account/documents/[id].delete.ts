// DELETE /api/payments/account/documents/:id — Remove a KYC document.
import { getActiveTenant } from '../../../../utils/tenant';
import { createSupabaseAdmin } from '../../../../utils/supabase-admin';

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET_KYC || 'tenant-kyc';

export default defineEventHandler(async (event) => {
  const tenant = await getActiveTenant(event);
  if (!tenant) throw createError({ statusCode: 404, message: 'Tenant não encontrado' });

  const docId = getRouterParam(event, 'id');
  if (!docId) throw createError({ statusCode: 400, message: 'id obrigatório' });

  const admin = await createSupabaseAdmin(event);

  // Validate ownership
  const { data: doc } = await admin
    .from('tenant_payment_documents')
    .select('id, file_storage_key, account_id, tenant_payment_accounts!inner(tenant_id)')
    .eq('id', docId)
    .maybeSingle();

  if (!doc) throw createError({ statusCode: 404, message: 'Documento não encontrado' });

  const accountTenantId = (doc as any).tenant_payment_accounts?.tenant_id;
  if (accountTenantId !== tenant.id) {
    throw createError({ statusCode: 403, message: 'Acesso negado' });
  }

  // Remove from storage
  if (doc.file_storage_key) {
    await admin.storage.from(BUCKET).remove([doc.file_storage_key]);
  }

  // Remove record
  await admin.from('tenant_payment_documents').delete().eq('id', docId);

  return { ok: true };
});
