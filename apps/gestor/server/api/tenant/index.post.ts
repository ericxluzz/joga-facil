import { serverSupabaseUser } from '#supabase/server';
import { db } from '@agendaslim/db/client';
import {
  tenants,
  tenantUsers,
  users,
  resources,
  services,
  scheduleRules,
  defaultTenantSettings,
} from '@agendaslim/db/schema';
import { eq } from 'drizzle-orm';

// POST /api/tenant — cria tenant a partir do onboarding (5 passos)
// Body esperado:
// {
//   name, slug, type, whatsapp, address, addressNumber, cep?,
//   resources: [{ name, type }],
//   services: [{ name, durationMinutes, priceCents }],
//   scheduleRules: [{ weekdays:[0..6], startTime, endTime, priceModifier }],
//   settings: { ... }
// }
export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const user = await serverSupabaseUser(event);

  if (!user && process.env.MOCK_AUTH !== '1') {
    throw createError({ statusCode: 401, message: 'Não autorizado' });
  }

  if (!body.name || !body.slug) {
    throw createError({ statusCode: 400, message: 'name e slug são obrigatórios' });
  }

  // Slug duplicado?
  const existing = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, body.slug))
    .limit(1);
  if (existing[0]) {
    throw createError({ statusCode: 409, message: 'Esse slug já está em uso' });
  }

  const mergedSettings = {
    ...defaultTenantSettings,
    ...(body.settings || {}),
    whatsapp: body.whatsapp,
  };

  return await db.transaction(async (tx) => {
    // 1. Tenant
    const [tenant] = await tx
      .insert(tenants)
      .values({
        slug: body.slug,
        name: body.name,
        type: body.type || 'society',
        photoUrl: body.photoUrl ?? null,
        address: [body.address, body.addressNumber].filter(Boolean).join(', ') || body.address || null,
        settings: mergedSettings,
        plan: 'trial',
        status: 'active',
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      })
      .returning();

    // 2. User vínculo (somente em modo real com user)
    if (user) {
      // Garante que user existe na tabela pública
      await tx
        .insert(users)
        .values({
          id: user.id,
          email: user.email || `${user.id}@noemail.local`,
          fullName: (user.user_metadata as any)?.full_name,
        })
        .onConflictDoNothing();

      await tx.insert(tenantUsers).values({
        tenantId: tenant.id,
        userId: user.id,
        role: 'owner',
      });
    }

    // 3. Resources
    const resourcesPayload = (body.resources || [])
      .filter((r: any) => r?.name)
      .map((r: any) => ({
        tenantId: tenant.id,
        name: r.name,
        type: r.type || tenant.type,
      }));
    const insertedResources = resourcesPayload.length
      ? await tx.insert(resources).values(resourcesPayload).returning()
      : [];

    // 4. Services
    const servicesPayload = (body.services || [])
      .filter((s: any) => s?.name)
      .map((s: any) => ({
        tenantId: tenant.id,
        name: s.name,
        durationMinutes: s.durationMinutes || 60,
        basePriceCents: Math.round((s.priceCents ?? s.basePriceCents ?? 10000)),
      }));
    if (servicesPayload.length) {
      await tx.insert(services).values(servicesPayload);
    }

    // 5. Schedule rules (achata weekdays → uma linha por dia)
    const rulesPayload = (body.scheduleRules || []).flatMap((rule: any) => {
      const weekdaysList: number[] = Array.isArray(rule.weekdays)
        ? rule.weekdays
        : typeof rule.weekday === 'number'
        ? [rule.weekday]
        : [];
      const resourceIds = insertedResources.length
        ? insertedResources.map((r) => r.id)
        : [];
      return weekdaysList.flatMap((weekday) =>
        resourceIds.map((resourceId) => ({
          tenantId: tenant.id,
          resourceId,
          weekday,
          startTime: rule.startTime || '08:00',
          endTime: rule.endTime || '22:00',
          priceModifier: String(rule.priceModifier ?? 1.0),
        })),
      );
    });
    if (rulesPayload.length) {
      await tx.insert(scheduleRules).values(rulesPayload);
    }

    return tenant;
  });
});
