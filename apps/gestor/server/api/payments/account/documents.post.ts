// POST /api/payments/account/documents — Upload a KYC document to Supabase Storage.
// Expects multipart/form-data with fields: documentType, file (binary)
import { getActiveTenant } from '../../../utils/tenant';
import { createSupabaseAdmin } from '../../../utils/supabase-admin';

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET_KYC || 'tenant-kyc';

export default defineEventHandler(async (event) => {
  const tenant = await getActiveTenant(event);
  if (!tenant) throw createError({ statusCode: 404, message: 'Tenant não encontrado' });

  const admin = await createSupabaseAdmin(event);

  // Get account
  const { data: account } = await admin
    .from('tenant_payment_accounts')
    .select('id, status')
    .eq('tenant_id', tenant.id)
    .maybeSingle();

  if (!account) {
    throw createError({ statusCode: 404, message: 'Conta financeira não encontrada. Crie o cadastro primeiro.' });
  }
  if (account.status === 'approved') {
    throw createError({ statusCode: 409, message: 'Conta já aprovada — não é possível alterar documentos.' });
  }

  // Parse multipart
  const formData = await readMultipartFormData(event);
  if (!formData) throw createError({ statusCode: 400, message: 'Formulário multipart inválido.' });

  const documentTypeField = formData.find((f) => f.name === 'documentType');
  const fileField = formData.find((f) => f.name === 'file');

  if (!documentTypeField?.data) throw createError({ statusCode: 400, message: 'documentType é obrigatório.' });
  if (!fileField?.data) throw createError({ statusCode: 400, message: 'Arquivo é obrigatório.' });

  const documentType = documentTypeField.data.toString();
  const mimeType = fileField.type || 'application/octet-stream';
  const ext = mimeType.includes('pdf') ? 'pdf' : mimeType.split('/')[1] || 'bin';
  const storageKey = `${tenant.id}/${account.id}/${documentType}_${Date.now()}.${ext}`;

  // Upload to Supabase Storage (private bucket)
  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(storageKey, fileField.data, {
      contentType: mimeType,
      upsert: false,
    });

  if (uploadError) {
    throw createError({ statusCode: 500, message: `Upload falhou: ${uploadError.message}` });
  }

  // Generate a 7-day signed URL
  const { data: signedData, error: signedError } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(storageKey, 7 * 24 * 3600);

  if (signedError || !signedData?.signedUrl) {
    throw createError({ statusCode: 500, message: 'Falha ao gerar URL assinada.' });
  }

  const now = new Date().toISOString();
  const { data: doc, error: docError } = await admin
    .from('tenant_payment_documents')
    .insert({
      account_id: account.id,
      document_type: documentType,
      file_url: signedData.signedUrl,
      file_storage_key: storageKey,
      mime_type: mimeType,
      status: 'uploaded',
      updated_at: now,
    })
    .select('id, document_type, file_url, status')
    .single();

  if (docError) throw createError({ statusCode: 500, message: docError.message });

  return {
    ok: true,
    document: {
      id: doc!.id,
      documentType: doc!.document_type,
      fileUrl: doc!.file_url,
      status: doc!.status,
    },
  };
});
