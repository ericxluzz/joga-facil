// GET /api/r/[slug]/slots?date=YYYY-MM-DD&resourceId=...
import { getTenantBySlug } from '../../../utils/tenant';
import { createSupabaseAdmin } from '../../../utils/supabase-admin';
import { getAvailableSlots } from '@agendaslim/core/slots';

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug');
  if (!slug) throw createError({ statusCode: 400, message: 'slug obrigatório' });

  const query = getQuery(event);
  const date = (query.date as string) || new Date().toISOString().substring(0, 10);
  const resourceId = query.resourceId as string | undefined;

  const tenant = await getTenantBySlug(slug);
  if (!tenant) throw createError({ statusCode: 404, message: 'Estabelecimento não encontrado' });

  const admin = createSupabaseAdmin();

  // Resolve resource (1º ativo se não especificado)
  let targetResourceId = resourceId;
  if (!targetResourceId) {
    const { data: firstRes } = await admin
      .from('resources')
      .select('id')
      .eq('tenant_id', tenant.id)
      .eq('active', true)
      .limit(1)
      .single();
    if (!firstRes) return { slug, date, resourceId: null, slots: [] };
    targetResourceId = firstRes.id;
  }

  // Serviço padrão
  const { data: svcList } = await admin
    .from('services')
    .select('*')
    .eq('tenant_id', tenant.id)
    .eq('active', true);

  const service =
    (svcList || []).find((s: any) => s.resource_id === targetResourceId) ||
    (svcList || []).find((s: any) => s.resource_id === null) ||
    (svcList || [])[0];
  if (!service) return { slug, date, resourceId: targetResourceId, slots: [] };

  // Regras de horário
  const { data: rulesData } = await admin
    .from('schedule_rules')
    .select('weekday, start_time, end_time, price_modifier')
    .eq('resource_id', targetResourceId)
    .eq('active', true);

  // Bloqueios do dia
  const dayStart = `${date}T00:00:00`;
  const dayEnd = `${date}T23:59:59`;

  const { data: blocksData } = await admin
    .from('blocks')
    .select('starts_at, ends_at')
    .eq('tenant_id', tenant.id)
    .or(`resource_id.eq.${targetResourceId},resource_id.is.null`)
    .gte('ends_at', dayStart)
    .lte('starts_at', dayEnd);

  // Reservas existentes
  const { data: existingBookingsData } = await admin
    .from('bookings')
    .select('starts_at, ends_at')
    .eq('resource_id', targetResourceId)
    .in('status', ['hold', 'pending_approval', 'confirmed'])
    .gte('ends_at', dayStart)
    .lte('starts_at', dayEnd);

  const settings = (tenant.settings as any) || {};
  const slots = getAvailableSlots({
    date,
    timezone: tenant.timezone,
    durationMinutes: service.duration_minutes,
    basePriceCents: service.base_price_cents,
    rules: (rulesData || []).map((r: any) => ({
      weekday: r.weekday,
      startTime: r.start_time,
      endTime: r.end_time,
      priceModifier: parseFloat(r.price_modifier),
    })),
    blocks: (blocksData || []).map((b: any) => ({
      startsAt: new Date(b.starts_at),
      endsAt: new Date(b.ends_at),
    })),
    existingBookings: (existingBookingsData || []).map((b: any) => ({
      startsAt: new Date(b.starts_at),
      endsAt: new Date(b.ends_at),
    })),
    minAdvanceMinutes: settings.minAdvanceMinutes ?? 60,
    maxAdvanceDays: settings.maxAdvanceDays ?? 30,
  });

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
      durationMinutes: service.duration_minutes,
      priceCents: s.priceCents,
      isPeak: s.priceCents > service.base_price_cents,
      available: s.available,
      reason: s.reason,
    })),
  };
});
