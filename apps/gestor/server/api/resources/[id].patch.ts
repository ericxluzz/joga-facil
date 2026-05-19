import { getActiveTenant } from '../../utils/tenant';
import { db } from '@agendaslim/db/client';
import { resources } from '@agendaslim/db/schema';
import { and, eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  if (!id) throw createError({ statusCode: 400, message: 'id obrigatório' });

  const tenant = await getActiveTenant(event);
  if (!tenant) throw createError({ statusCode: 404, message: 'Estabelecimento não encontrado' });

  const body = await readBody(event);

  const patch: Record<string, any> = { updatedAt: new Date() };
  if (body.name !== undefined) patch.name = body.name;
  if (body.type !== undefined) patch.type = body.type;
  if (body.photoUrl !== undefined) patch.photoUrl = body.photoUrl;
  if (body.active !== undefined) patch.active = body.active;
  if (body.config !== undefined) patch.config = body.config;

  const [resource] = await db
    .update(resources)
    .set(patch)
    .where(and(eq(resources.id, id), eq(resources.tenantId, tenant.id)))
    .returning();

  if (!resource) throw createError({ statusCode: 404, message: 'Quadra não encontrada' });
  return resource;
});
