import { getActiveTenant } from '../../utils/tenant';
import { db } from '@agendaslim/db/client';
import { services } from '@agendaslim/db/schema';
import { and, eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  if (!id) throw createError({ statusCode: 400, message: 'id obrigatório' });

  const tenant = await getActiveTenant(event);
  if (!tenant) throw createError({ statusCode: 404, message: 'Estabelecimento não encontrado' });

  await db.delete(services).where(and(eq(services.id, id), eq(services.tenantId, tenant.id)));
  return { id, deleted: true };
});
