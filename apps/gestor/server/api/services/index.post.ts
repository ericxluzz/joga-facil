import { getActiveTenant } from '../../utils/tenant';
import { db } from '@agendaslim/db/client';
import { services } from '@agendaslim/db/schema';

export default defineEventHandler(async (event) => {
  const tenant = await getActiveTenant(event);
  if (!tenant) throw createError({ statusCode: 404, message: 'Estabelecimento não encontrado' });

  const body = await readBody(event);
  if (!body.name || !body.durationMinutes || body.basePriceCents === undefined) {
    throw createError({ statusCode: 400, message: 'name, durationMinutes e basePriceCents são obrigatórios' });
  }

  const [service] = await db
    .insert(services)
    .values({
      tenantId: tenant.id,
      resourceId: body.resourceId || null,
      name: body.name,
      description: body.description || null,
      durationMinutes: body.durationMinutes,
      basePriceCents: body.basePriceCents,
    })
    .returning();

  return service;
});
