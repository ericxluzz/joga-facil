import { getActiveTenant } from '../../utils/tenant';
import {
  createSupabaseAdmin,
  mapResource,
  mapScheduleRule,
} from '../../utils/supabase-admin';
import { getAvailableSlots } from '@agendaslim/core';

export default defineEventHandler(async (event) => {
  const tenant = await getActiveTenant(event);
  if (!tenant) {
    throw createError({ statusCode: 404, message: 'Estabelecimento não encontrado' });
  }

  const admin = await createSupabaseAdmin(event);
  const query = getQuery(event);

  // Se o caller passou status mas NÃO passou date, listamos sem filtro de data
  // (ex: página de aprovações que quer TODOS os pendentes)
  const hasExplicitDate = !!query.date;
  const dateStr = (query.date as string) || new Date().toISOString().slice(0, 10);

  let q = admin
    .from('bookings')
    .select(
      'id, resource_id, customer_name, customer_phone, starts_at, ends_at, status, total_cents, resources(name)',
    )
    .eq('tenant_id', tenant.id)
    .order('starts_at');

  // Aplica filtro de data somente quando há data explícita OU quando não há filtro de status
  if (hasExplicitDate || !query.status) {
    q = q
      .gte('starts_at', `${dateStr}T00:00:00`)
      .lte('starts_at', `${dateStr}T23:59:59`);
  }

  if (query.status) {
    q = q.eq('status', query.status as string);
  }

  const { data: result, error } = await q;
  if (error) throw createError({ statusCode: 500, message: error.message });

  const bookings = (result || []).map((b: any) => {
    const startsAt = new Date(b.starts_at);
    const endsAt = new Date(b.ends_at);
    return {
      id: b.id,
      resourceId: b.resource_id,
      resourceName: b.resources?.name ?? '',
      customerName: b.customer_name,
      customerPhone: b.customer_phone,
      date: startsAt.toISOString().substring(0, 10),
      startTime: startsAt.toISOString().substring(11, 16),
      endTime: endsAt.toISOString().substring(11, 16),
      startsAtUtc: startsAt.toISOString(),
      endsAtUtc: endsAt.toISOString(),
      status: b.status,
      priceCents: b.total_cents,
    };
  });

  // Available slots só é calculado quando há uma data específica (agenda diária)
  // Quando listamos por status sem data (aprovações), retornamos sem slots
  if (!hasExplicitDate && query.status) {
    return { bookings, availableSlots: {} };
  }

  // Available slots por resource ativo, baseado nas schedule_rules
  const targetWeekday = new Date(`${dateStr}T12:00:00`).getDay();

  const [
    { data: resourcesData },
    { data: rulesData },
    { data: servicesData },
  ] = await Promise.all([
    admin.from('resources').select('*').eq('tenant_id', tenant.id).eq('active', true),
    admin
      .from('schedule_rules')
      .select('*')
      .eq('tenant_id', tenant.id)
      .eq('active', true)
      .eq('weekday', targetWeekday),
    admin.from('services').select('*').eq('tenant_id', tenant.id).eq('active', true).limit(1),
  ]);

  const defaultService = servicesData?.[0] || null;
  const durationMinutes = defaultService?.duration_minutes ?? 60;
  const basePriceCents = defaultService?.base_price_cents ?? 0;

  const availableSlotsByResource: Record<string, any[]> = {};

  for (const res of resourcesData || []) {
    const r = mapResource(res);
    const rules = (rulesData || [])
      .filter((rr: any) => !rr.resource_id || rr.resource_id === r.id)
      .map(mapScheduleRule);

    if (rules.length === 0) {
      availableSlotsByResource[r.id] = [];
      continue;
    }

    const existingBookings = bookings
      .filter((b) => b.resourceId === r.id && b.status !== 'cancelled' && b.status !== 'expired')
      .map((b) => ({ startsAt: new Date(b.startsAtUtc), endsAt: new Date(b.endsAtUtc) }));

    const slots = getAvailableSlots({
      date: dateStr,
      timezone: tenant.timezone || 'America/Sao_Paulo',
      durationMinutes,
      basePriceCents,
      rules,
      existingBookings,
    }).map((s) => ({
      startsAt: s.startsAt.toISOString(),
      endsAt: s.endsAt.toISOString(),
      startTime: s.startsAt.toISOString().substring(11, 16),
      endTime: s.endsAt.toISOString().substring(11, 16),
      priceCents: s.priceCents,
      available: s.available,
      reason: s.reason ?? null,
    }));

    availableSlotsByResource[r.id] = slots;
  }

  return { bookings, availableSlots: availableSlotsByResource };
});
