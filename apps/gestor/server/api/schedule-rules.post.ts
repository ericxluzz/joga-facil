import { db } from '@agendaslim/db/client';
import { scheduleRules } from '@agendaslim/db/schema';

// POST /api/schedule-rules — Cria regras de horário vinculadas ao tenant
export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const tenantId = body.tenantId;

  if (!tenantId) {
    throw createError({ statusCode: 400, message: 'tenantId é obrigatório' });
  }

  const payload = (body.rules || []).flatMap((r: any) =>
    (r.weekdays || []).map((weekday: number) => ({
      tenantId,
      resourceId: body.resourceId,
      weekday,
      startTime: r.startTime,
      endTime: r.endTime,
      priceModifier: String(r.priceModifier || 1.0),
      active: true,
    }))
  );

  if (payload.length === 0) {
    return { rules: [] };
  }

  const inserted = await db
    .insert(scheduleRules)
    .values(payload)
    .returning();

  return { rules: inserted };
});
