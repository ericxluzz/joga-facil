import { getActiveTenant } from '../../utils/tenant';
import { db } from '@agendaslim/db/client';
import { tenants } from '@agendaslim/db/schema';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const tenant = await getActiveTenant(event);

  if (!tenant) {
    throw createError({ statusCode: 404, message: 'Estabelecimento não encontrado' });
  }

  // Merge settings
  const mergedSettings = {
    ...tenant.settings,
    ...body.settings,
  };

  const [updatedTenant] = await db
    .update(tenants)
    .set({
      name: body.name ?? tenant.name,
      slug: body.slug ?? tenant.slug,
      photoUrl: body.photoUrl !== undefined ? body.photoUrl : tenant.photoUrl,
      address: body.address !== undefined ? body.address : tenant.address,
      settings: mergedSettings,
      updatedAt: new Date(),
    })
    .where(eq(tenants.id, tenant.id))
    .returning();

  return updatedTenant;
});
