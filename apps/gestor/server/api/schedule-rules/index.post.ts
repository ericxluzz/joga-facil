import { getActiveTenant } from '../../utils/tenant';
import { db } from '@agendaslim/db/client';
import { scheduleRules } from '@agendaslim/db/schema';

export default defineEventHandler(async (event) => {
  const tenant = await getActiveTenant(event);
  if (!tenant) throw createError({ statusCode: 404, message: 'Estabelecimento não encontrado' });

  const body = await readBody(event);
  if (!body.resourceId || body.weekday === undefined || !body.startTime || !body.endTime) {
    throw createError({
      statusCode: 400,
      message: 'resourceId, weekday, startTime, endTime obrigatórios',
    });
  }

  const [rule] = await db
    .insert(scheduleRules)
    .values({
      tenantId: tenant.id,
      resourceId: body.resourceId,
      weekday: body.weekday,
      startTime: body.startTime,
      endTime: body.endTime,
      priceModifier: String(body.priceModifier ?? 1.0),
    })
    .returning();

  return rule;
});
