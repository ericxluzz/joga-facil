import { getActiveTenant } from '../../utils/tenant';
import { db } from '@agendaslim/db/client';
import { resources } from '@agendaslim/db/schema';

export default defineEventHandler(async (event) => {
  const tenant = await getActiveTenant(event);
  if (!tenant) throw createError({ statusCode: 404, message: 'Estabelecimento não encontrado' });

  const body = await readBody(event);
  if (!body.name) throw createError({ statusCode: 400, message: 'name é obrigatório' });

  const [resource] = await db
    .insert(resources)
    .values({
      tenantId: tenant.id,
      name: body.name,
      type: body.type || tenant.type,
      photoUrl: body.photoUrl ?? null,
    })
    .returning();

  return resource;
});
