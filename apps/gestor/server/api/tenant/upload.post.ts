// POST /api/tenant/upload
// Recebe { data: base64string, mimeType: string, uploadType: 'logo'|'photo' }
// Usa REST direto do Supabase Storage (sem SDK) — mais robusto
import { getActiveTenant } from '../../utils/tenant';

const BUCKET = 'tenant-assets';

async function ensureBucket(storageUrl: string, key: string) {
  // Tenta criar; 409 = já existe — ok
  await fetch(`${storageUrl}/bucket`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
      apikey: key,
    },
    body: JSON.stringify({
      id: BUCKET,
      name: BUCKET,
      public: true,
      file_size_limit: 5242880,
      allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp'],
    }),
  });
}

export default defineEventHandler(async (event) => {
  const tenant = await getActiveTenant(event);
  if (!tenant) throw createError({ statusCode: 404, message: 'Estabelecimento não encontrado' });

  const body = await readBody(event);
  const { data, mimeType, uploadType } = body as {
    data: string;
    mimeType: string;
    uploadType: 'logo' | 'photo';
  };

  if (!data || !mimeType || !uploadType) {
    throw createError({ statusCode: 400, message: 'data, mimeType e uploadType são obrigatórios' });
  }

  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(mimeType)) {
    throw createError({ statusCode: 422, message: 'Formato inválido. Use JPG, PNG ou WebP.' });
  }

  const base64 = data.includes(',') ? data.split(',')[1] : data;
  const buffer = Buffer.from(base64, 'base64');

  if (buffer.byteLength > 5 * 1024 * 1024) {
    throw createError({ statusCode: 422, message: 'Arquivo muito grande. Máximo 5MB.' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !key) {
    throw createError({ statusCode: 500, message: 'Variáveis de ambiente Supabase não configuradas.' });
  }

  const storageUrl = `${supabaseUrl}/storage/v1`;

  // Garante bucket via REST
  await ensureBucket(storageUrl, key);

  const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
  const objectPath = `${tenant.id}/${uploadType}.${ext}`;

  console.log('[upload] path:', objectPath, '| size:', buffer.byteLength, '| mime:', mimeType);

  // Upload via REST direto (upsert = sobrescreve)
  const uploadRes = await fetch(`${storageUrl}/object/${BUCKET}/${objectPath}`, {
    method: 'POST',
    headers: {
      'Content-Type': mimeType,
      Authorization: `Bearer ${key}`,
      apikey: key,
      'x-upsert': 'true',
    },
    body: buffer,
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    console.error('[upload] REST error:', uploadRes.status, errText);
    throw createError({ statusCode: 500, message: `Erro no storage: ${errText}` });
  }

  const publicUrl = `${storageUrl}/object/public/${BUCKET}/${objectPath}?t=${Date.now()}`;
  return { url: publicUrl };
});
