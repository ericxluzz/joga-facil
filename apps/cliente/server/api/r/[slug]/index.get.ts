import { db } from '@agendaslim/db/client';
import { tenants, resources, services } from '@agendaslim/db/schema';
import { eq } from 'drizzle-orm';

// GET /api/r/[slug] — dados públicos do estabelecimento
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug');
  if (!slug) throw createError({ statusCode: 400, message: 'slug obrigatório' });

  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.slug, slug))
    .limit(1);

  if (!tenant) {
    throw createError({ statusCode: 404, message: 'Estabelecimento não encontrado' });
  }

  // Load resources for this tenant
  const tenantResources = await db
    .select()
    .from(resources)
    .where(eq(resources.tenantId, tenant.id));

  // Load services for this tenant
  const tenantServices = await db
    .select()
    .from(services)
    .where(eq(services.tenantId, tenant.id));

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
    resources: tenantResources,
    services: tenantServices,
  };
});
