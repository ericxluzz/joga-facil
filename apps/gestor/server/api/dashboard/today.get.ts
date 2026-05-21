import { getActiveTenant } from '../../utils/tenant';
import {
  createSupabaseAdmin,
  mapBooking,
  mapResource,
  mapScheduleRule,
} from '../../utils/supabase-admin';

// GET /api/dashboard/today — agrega tudo do dia em uma única chamada.
//
// Retorna:
//  - tenant (nome, slug, photoUrl)
//  - todayBookings: lista das reservas de hoje ordenadas por horário
//  - pendingApprovalsCount: nº de aprovações pendentes
//  - todayPayments: lista de pagamentos recebidos hoje + total
//  - occupancy: { totalSlots, occupiedSlots, percentage }
const EMPTY_RESPONSE = {
  tenant: null,
  todayBookings: [],
  pendingApprovalsCount: 0,
  todayPayments: [],
  todayPaymentsTotalCents: 0,
  occupancy: { totalSlots: 0, occupiedSlots: 0, percentage: 0 },
};

export default defineEventHandler(async (event) => {
  let tenant: Awaited<ReturnType<typeof getActiveTenant>> = null;
  try {
    tenant = await getActiveTenant(event);
  } catch (err) {
    console.warn('[dashboard/today] getActiveTenant falhou:', err);
  }
  if (!tenant) return EMPTY_RESPONSE;

  const admin = await createSupabaseAdmin(event);
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const weekday = now.getDay();

  // Todas as 5 queries disparadas em paralelo após o tenant estar disponível
  const [
    { data: bookingsRaw },
    { count: pendingApprovalsCount },
    { data: paymentsRaw },
    { data: rulesRaw },
    { count: resourcesCount },
  ] = await Promise.all([
    // 1. Reservas de hoje
    admin
      .from('bookings')
      .select(
        'id, customer_name, customer_phone, starts_at, ends_at, status, total_cents, payment_method, resource_id, resources(id, name, photo_url)',
      )
      .eq('tenant_id', tenant.id)
      .gte('starts_at', startOfDay.toISOString())
      .lte('starts_at', endOfDay.toISOString())
      .order('starts_at', { ascending: true }),

    // 2. Aprovações pendentes (atuais e futuras)
    admin
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id)
      .eq('status', 'pending_approval')
      .gte('starts_at', now.toISOString()),

    // 3. Pagamentos recebidos hoje
    admin
      .from('payments')
      .select('id, paid_at, amount_cents, bookings!inner(id, customer_name, tenant_id, resources(name))')
      .eq('bookings.tenant_id', tenant.id)
      .eq('status', 'paid')
      .gte('paid_at', startOfDay.toISOString())
      .lte('paid_at', endOfDay.toISOString())
      .order('paid_at', { ascending: false })
      .limit(10),

    // 4. Regras de ocupação do dia
    admin
      .from('schedule_rules')
      .select('id, start_time, end_time, weekday, price_modifier, resource_id, tenant_id, active')
      .eq('tenant_id', tenant.id)
      .eq('active', true)
      .eq('weekday', weekday),

    // 5. Total de recursos ativos
    admin
      .from('resources')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id)
      .eq('active', true),
  ]);

  const todayBookings = (bookingsRaw || []).map((b: any) => ({
    id: b.id,
    customerName: b.customer_name,
    customerPhone: b.customer_phone,
    startsAt: b.starts_at,
    endsAt: b.ends_at,
    status: b.status,
    totalCents: b.total_cents,
    paymentMethod: b.payment_method,
    resourceId: b.resource_id,
    resourceName: b.resources?.name || 'Quadra',
    resourcePhotoUrl: b.resources?.photo_url || null,
  }));

  const todayPayments = (paymentsRaw || []).map((p: any) => ({
    id: p.id,
    paidAt: p.paid_at,
    amountCents: p.amount_cents,
    customerName: p.bookings?.customer_name || '—',
    resourceName: p.bookings?.resources?.name || '—',
  }));

  const todayPaymentsTotalCents = todayPayments.reduce(
    (s: number, p: any) => s + (p.amountCents || 0),
    0,
  );

  const rules = (rulesRaw || []).map(mapScheduleRule);

  // estima: para cada regra, soma minutos disponíveis e divide por 60 (slot 1h)
  let totalSlotsPerResource = 0;
  for (const r of rules) {
    const [sh, sm] = (r.startTime || '00:00').split(':').map(Number);
    const [eh, em] = (r.endTime || '00:00').split(':').map(Number);
    const minutes = (eh! * 60 + em!) - (sh! * 60 + sm!);
    if (minutes > 0) totalSlotsPerResource += Math.floor(minutes / 60);
  }
  const totalSlots = totalSlotsPerResource * (resourcesCount || 1);
  const occupiedSlots = todayBookings.filter((b) => b.status !== 'cancelled' && b.status !== 'expired').length;
  const occupancyPercentage = totalSlots > 0 ? Math.min(100, Math.round((occupiedSlots / totalSlots) * 100)) : 0;

  return {
    tenant: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      photoUrl: tenant.photoUrl,
    },
    todayBookings,
    pendingApprovalsCount: pendingApprovalsCount || 0,
    todayPayments,
    todayPaymentsTotalCents,
    occupancy: {
      totalSlots,
      occupiedSlots,
      percentage: occupancyPercentage,
    },
  };
});
