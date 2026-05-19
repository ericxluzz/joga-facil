import { db } from '@agendaslim/db/client';
import { resources } from '@agendaslim/db/schema';

// POST /api/resources — Cria quadras (resources) vinculadas ao tenant
export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const tenantId = body.tenantId;

  if (!tenantId) {
    throw createError({ statusCode: 400, message: 'tenantId é obrigatório' });
  }

  const payload = (body.resources || []).map((r: any) => ({
    tenantId,
    name: r.name,
    type: r.type || 'society',
    active: true,
  }));

  if (payload.length === 0) {
    return { resources: [] };
  }

  const inserted = await db
    .insert(resources)
    .values(payload)
    .returning();

  return { resources: inserted };
});
