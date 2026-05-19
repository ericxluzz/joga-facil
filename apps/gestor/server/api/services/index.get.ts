import { getActiveTenant } from '../../utils/tenant';
import { db } from '@agendaslim/db/client';
import { services } from '@agendaslim/db/schema';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const tenant = await getActiveTenant(event);
  if (!tenant) {
    throw createError({ statusCode: 404, message: 'Estabelecimento não encontrado' });
  }

  const list = await db
    .select()
    .from(services)
    .where(eq(services.tenantId, tenant.id));

  return {
    services: list
  };
});
