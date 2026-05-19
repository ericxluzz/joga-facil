import { db } from '@agendaslim/db/client';
import { services } from '@agendaslim/db/schema';

// POST /api/services — Cria serviços vinculados ao tenant
export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const tenantId = body.tenantId;

  if (!tenantId) {
    throw createError({ statusCode: 400, message: 'tenantId é obrigatório' });
  }

  const payload = (body.services || []).map((s: any) => ({
    tenantId,
    name: s.name,
    durationMinutes: s.durationMinutes,
    basePriceCents: typeof s.priceCents === 'number' ? Math.round(s.priceCents * 100) : (s.basePriceCents || 10000),
    active: true,
  }));

  if (payload.length === 0) {
    return { services: [] };
  }

  const inserted = await db
    .insert(services)
    .values(payload)
    .returning();

  return { services: inserted };
});
