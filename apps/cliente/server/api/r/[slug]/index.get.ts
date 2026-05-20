import { createSupabaseAdmin, mapTenant, mapResource, mapService } from '../../../utils/supabase-admin';

// GET /api/r/[slug] — dados públicos do estabelecimento
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug');
  if (!slug) throw createError({ statusCode: 400, message: 'slug obrigatório' });

  const admin = createSupabaseAdmin();

  const { data: tenantRow } = await admin.from('tenants').select('*').eq('slug', slug).single();
  if (!tenantRow) throw createError({ statusCode: 404, message: 'Estabelecimento não encontrado' });

  const tenant = mapTenant(tenantRow);

  const { data: resourceRows } = await admin.from('resources').select('*').eq('tenant_id', tenant.id);
  const { data: serviceRows } = await admin.from('services').select('*').eq('tenant_id', tenant.id);

  return {
    id: tenant.id,
    slug: tenant.slug,
    name: tenant.name,
    address: tenant.address,
    description: tenant.settings?.description,
    photoUrl: tenant.photoUrl,
    whatsapp: tenant.settings?.whatsapp,
    instagram: tenant.settings?.instagram,
    cancellationPolicy: tenant.settings?.cancellationPolicy || 'Cancelamentos com mais de 24h de antecedência são reembolsados integralmente.',
    settings: tenant.settings,
    resources: (resourceRows || []).map(mapResource),
    services: (serviceRows || []).map(mapService),
  };
});
