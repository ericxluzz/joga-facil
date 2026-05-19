import { getActiveTenant } from '../../utils/tenant';
import { db } from '@agendaslim/db/client';
import { services } from '@agendaslim/db/schema';
import { and, eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  if (!id) throw createError({ statusCode: 400, message: 'id obrigatório' });

  const tenant = await getActiveTenant(event);
  if (!tenant) throw createError({ statusCode: 404, message: 'Estabelecimento não encontrado' });

  const body = await readBody(event);
  const patch: Record<string, any> = { updatedAt: new Date() };
  if (body.name !== undefined) patch.name = body.name;
  if (body.description !== undefined) patch.description = body.description;
  if (body.durationMinutes !== undefined) patch.durationMinutes = body.durationMinutes;
  if (body.basePriceCents !== undefined) patch.basePriceCents = body.basePriceCents;
  if (body.resourceId !== undefined) patch.resourceId = body.resourceId;
  if (body.active !== undefined) patch.active = body.active;

  const [service] = await db
    .update(services)
    .set(patch)
    .where(and(eq(services.id, id), eq(services.tenantId, tenant.id)))
    .returning();

  if (!service) throw createError({ statusCode: 404, message: 'Serviço não encontrado' });
  return service;
});
