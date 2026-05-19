import { getActiveTenant } from '../../utils/tenant';
import { db } from '@agendaslim/db/client';
import { scheduleRules, resources } from '@agendaslim/db/schema';
import { eq, and } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const tenant = await getActiveTenant(event);
  if (!tenant) {
    throw createError({ statusCode: 404, message: 'Estabelecimento não encontrado' });
  }

  const query = getQuery(event);
  const resourceId = query.resourceId as string | undefined;

  const conditions = [eq(scheduleRules.tenantId, tenant.id)];
  if (resourceId) {
    conditions.push(eq(scheduleRules.resourceId, resourceId));
  }

  const list = await db
    .select({
      id: scheduleRules.id,
      resourceId: scheduleRules.resourceId,
      resourceName: resources.name,
      weekday: scheduleRules.weekday,
      startTime: scheduleRules.startTime,
      endTime: scheduleRules.endTime,
      priceModifier: scheduleRules.priceModifier,
      active: scheduleRules.active,
    })
    .from(scheduleRules)
    .innerJoin(resources, eq(scheduleRules.resourceId, resources.id))
    .where(and(...conditions));

  const mapped = list.map(r => ({
    ...r,
    priceModifier: parseFloat(r.priceModifier),
  }));

  return { rules: mapped };
});
