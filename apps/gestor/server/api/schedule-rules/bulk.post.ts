import { getActiveTenant } from '../../utils/tenant';
import { db } from '@agendaslim/db/client';
import { scheduleRules } from '@agendaslim/db/schema';
import { eq } from 'drizzle-orm';

// POST /api/schedule-rules/bulk — substitui todas as regras de um recurso
export default defineEventHandler(async (event) => {
  const tenant = await getActiveTenant(event);
  if (!tenant) {
    throw createError({ statusCode: 404, message: 'Estabelecimento não encontrado' });
  }

  const body = await readBody(event);
  const { resourceId, rules } = body as { resourceId: string; rules: any[] };

  if (!resourceId) {
    throw createError({ statusCode: 400, message: 'resourceId é obrigatório' });
  }

  const payload = (rules || []).flatMap((r: any) => {
    const weekdaysList = Array.isArray(r.weekdays) ? r.weekdays : (r.weekday !== undefined ? [r.weekday] : []);
    return weekdaysList.map((weekday: number) => ({
      tenantId: tenant.id,
      resourceId,
      weekday,
      startTime: r.startTime,
      endTime: r.endTime,
      priceModifier: String(r.priceModifier || 1.0),
      active: r.active !== undefined ? r.active : true,
    }));
  });

  let inserted: any[] = [];
  if (payload.length > 0) {
    inserted = await db.transaction(async (tx) => {
      await tx
        .delete(scheduleRules)
        .where(eq(scheduleRules.resourceId, resourceId));

      return await tx
        .insert(scheduleRules)
        .values(payload)
        .returning();
    });
  } else {
    await db
      .delete(scheduleRules)
      .where(eq(scheduleRules.resourceId, resourceId));
  }

  return {
    resourceId,
    count: inserted.length,
    rules: inserted,
  };
});
