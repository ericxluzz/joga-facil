import { getActiveTenant } from '../../utils/tenant';
import { db } from '@agendaslim/db/client';
import { tenants } from '@agendaslim/db/schema';
import { eq } from 'drizzle-orm';

// PATCH /api/tenant/settings — Atualiza as configurações (settings) do tenant
export default defineEventHandler(async (event) => {
  const tenant = await getActiveTenant(event);
  if (!tenant) {
    throw createError({ statusCode: 404, message: 'Estabelecimento não encontrado' });
  }

  const body = await readBody(event);

  const updatedSettings = {
    ...(tenant.settings || {}),
    requireRegistration: body.requireRegistration ?? tenant.settings?.requireRegistration ?? false,
    acceptPayOnSite: body.acceptPayOnSite ?? tenant.settings?.acceptPayOnSite ?? false,
    minAdvanceMinutes: body.minAdvanceMinutes ?? tenant.settings?.minAdvanceMinutes ?? 60,
    maxAdvanceDays: body.maxAdvanceDays ?? tenant.settings?.maxAdvanceDays ?? 30,
    holdMinutes: body.holdMinutes ?? tenant.settings?.holdMinutes ?? 10,
    payOnSiteTimeoutMinutes: body.payOnSiteTimeoutMinutes ?? tenant.settings?.payOnSiteTimeoutMinutes ?? 60,
    cancellationPolicy: body.cancellationPolicy ?? tenant.settings?.cancellationPolicy ?? '',
  };

  const [updatedTenant] = await db
    .update(tenants)
    .set({
      settings: updatedSettings,
      updatedAt: new Date(),
    })
    .where(eq(tenants.id, tenant.id))
    .returning();

  return { settings: updatedTenant.settings };
});
