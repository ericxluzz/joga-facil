// GET /api/r/[slug]/slots?date=YYYY-MM-DD&resourceId=...
// Usa o algoritmo getAvailableSlots do @agendaslim/core com dados reais do DB.

import { getTenantBySlug } from '../../../utils/tenant';
import { db } from '@agendaslim/db/client';
import { scheduleRules, blocks, bookings, services, resources } from '@agendaslim/db/schema';
import { and, eq, gte, lte, or, isNull, inArray } from 'drizzle-orm';
import { getAvailableSlots } from '@agendaslim/core/slots';

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug');
  if (!slug) throw createError({ statusCode: 400, message: 'slug obrigatório' });

  const query = getQuery(event);
  const date = (query.date as string) || new Date().toISOString().substring(0, 10);
  const resourceId = query.resourceId as string | undefined;

  const tenant = await getTenantBySlug(slug);
  if (!tenant) throw createError({ statusCode: 404, message: 'Estabelecimento não encontrado' });

  // Resolve resource (1º ativo se não especificado)
  let targetResourceId = resourceId;
  if (!targetResourceId) {
    const [first] = await db
      .select({ id: resources.id })
      .from(resources)
      .where(and(eq(resources.tenantId, tenant.id), eq(resources.active, true)))
      .limit(1);
    if (!first) return { slug, date, resourceId: null, slots: [] };
    targetResourceId = first.id;
  }

  // Serviço padrão (primeiro serviço ativo deste tenant, com escopo geral ou no resource)
  const svcList = await db
    .select()
    .from(services)
    .where(and(eq(services.tenantId, tenant.id), eq(services.active, true)));
  const service =
    svcList.find((s) => s.resourceId === targetResourceId) ||
    svcList.find((s) => s.resourceId === null) ||
    svcList[0];
  if (!service) return { slug, date, resourceId: targetResourceId, slots: [] };

  // Regras de horário do resource (todas as weekdays)
  const rules = await db
    .select({
      weekday: scheduleRules.weekday,
      startTime: scheduleRules.startTime,
      endTime: scheduleRules.endTime,
      priceModifier: scheduleRules.priceModifier,
    })
    .from(scheduleRules)
    .where(and(eq(scheduleRules.resourceId, targetResourceId), eq(scheduleRules.active, true)));

  // Bloqueios do dia (do resource ou globais)
  const dayStart = new Date(`${date}T00:00:00`);
  const dayEnd = new Date(`${date}T23:59:59`);
  const blocksList = await db
    .select({ startsAt: blocks.startsAt, endsAt: blocks.endsAt })
    .from(blocks)
    .where(
      and(
        eq(blocks.tenantId, tenant.id),
        or(eq(blocks.resourceId, targetResourceId), isNull(blocks.resourceId)),
        gte(blocks.endsAt, dayStart),
        lte(blocks.startsAt, dayEnd),
      ),
    );

  // Reservas existentes que travam slot (hold/pending/confirmed)
  const existingBookings = await db
    .select({ startsAt: bookings.startsAt, endsAt: bookings.endsAt })
    .from(bookings)
    .where(
      and(
        eq(bookings.resourceId, targetResourceId),
        inArray(bookings.status, ['hold', 'pending_approval', 'confirmed']),
        gte(bookings.endsAt, dayStart),
        lte(bookings.startsAt, dayEnd),
      ),
    );

  // Roda o algoritmo do core
  const settings = (tenant.settings as any) || {};
  const slots = getAvailableSlots({
    date,
    timezone: tenant.timezone,
    durationMinutes: service.durationMinutes,
    basePriceCents: service.basePriceCents,
    rules: rules.map((r) => ({
      weekday: r.weekday,
      startTime: r.startTime,
      endTime: r.endTime,
      priceModifier: parseFloat(r.priceModifier),
    })),
    blocks: blocksList,
    existingBookings,
    minAdvanceMinutes: settings.minAdvanceMinutes ?? 60,
    maxAdvanceDays: settings.maxAdvanceDays ?? 30,
  });

  // Mapeia pro formato que o frontend espera
  return {
    slug,
    date,
    resourceId: targetResourceId,
    serviceId: service.id,
    slots: slots.map((s) => ({
      id: `${date}-${targetResourceId}-${s.startsAt.toISOString()}`,
      resourceId: targetResourceId,
      serviceId: service.id,
      time: s.startsAt.toISOString().substring(11, 16),
      startsAt: s.startsAt.toISOString(),
      endsAt: s.endsAt.toISOString(),
      durationMinutes: service.durationMinutes,
      priceCents: s.priceCents,
      isPeak: s.priceCents > service.basePriceCents,
      available: s.available,
      reason: s.reason,
    })),
  };
});
