import { getActiveTenant } from '../../utils/tenant';
import { db } from '@agendaslim/db/client';
import { blocks, resources } from '@agendaslim/db/schema';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const tenant = await getActiveTenant(event);
  if (!tenant) throw createError({ statusCode: 404, message: 'Estabelecimento não encontrado' });

  const list = await db
    .select({
      id: blocks.id,
      resourceId: blocks.resourceId,
      resourceName: resources.name,
      startsAt: blocks.startsAt,
      endsAt: blocks.endsAt,
      reason: blocks.reason,
    })
    .from(blocks)
    .leftJoin(resources, eq(blocks.resourceId, resources.id))
    .where(eq(blocks.tenantId, tenant.id));

  return {
    blocks: list.map((b) => ({
      ...b,
      resourceName: b.resourceName || 'Todas as quadras',
    })),
  };
});
