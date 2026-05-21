// POST /api/seed — Insere dados mock para testes (somente em desenvolvimento)
import { getActiveTenant } from '../utils/tenant';
import { createSupabaseAdmin } from '../utils/supabase-admin';

export default defineEventHandler(async (event) => {
  if (process.env.NODE_ENV === 'production') {
    throw createError({ statusCode: 403, message: 'Não disponível em produção' });
  }

  const tenant = await getActiveTenant(event);
  if (!tenant) {
    throw createError({ statusCode: 404, message: 'Tenant não encontrado' });
  }

  const admin = await createSupabaseAdmin(event);

  // Limpa dados existentes do tenant
  await admin.from('bookings').delete().eq('tenant_id', tenant.id);
  await admin.from('schedule_rules').delete().eq('tenant_id', tenant.id);
  await admin.from('services').delete().eq('tenant_id', tenant.id);
  await admin.from('resources').delete().eq('tenant_id', tenant.id);

  // Quadras
  const { data: resources } = await admin.from('resources').insert([
    { tenant_id: tenant.id, name: 'Quadra 1 – Society', type: 'society', active: true },
    { tenant_id: tenant.id, name: 'Quadra 2 – Society', type: 'society', active: true },
    { tenant_id: tenant.id, name: 'Quadra 3 – Beach Tennis', type: 'beach_tennis', active: true },
  ]).select();

  if (!resources?.length) throw createError({ statusCode: 500, message: 'Falha ao criar quadras' });

  // Serviços
  const { data: services } = await admin.from('services').insert([
    { tenant_id: tenant.id, name: '1h Society', duration_minutes: 60, base_price_cents: 12000, active: true },
    { tenant_id: tenant.id, name: '1h Beach Tennis', duration_minutes: 60, base_price_cents: 15000, active: true },
  ]).select();

  const svc = services?.[0];
  const svcBeach = services?.[1];

  // Regras de horário (Seg–Sex 08–22, Sáb 07–22)
  const rulesPayload: any[] = [];
  for (const r of resources) {
    for (const wd of [1, 2, 3, 4, 5]) {
      rulesPayload.push({ tenant_id: tenant.id, resource_id: r.id, weekday: wd, start_time: '08:00', end_time: '22:00', price_modifier: 1.0, active: true });
    }
    rulesPayload.push({ tenant_id: tenant.id, resource_id: r.id, weekday: 6, start_time: '07:00', end_time: '22:00', price_modifier: 1.2, active: true });
  }
  await admin.from('schedule_rules').insert(rulesPayload);

  if (!svc) throw createError({ statusCode: 500, message: 'Falha ao criar serviços' });

  // Reservas dos últimos 30 dias
  const customers = [
    { name: 'Carlos Mendonça', phone: '(11) 99123-4567' },
    { name: 'Rafael Souza', phone: '(11) 98765-4321' },
    { name: 'Ana Lima', phone: '(11) 96543-2109' },
    { name: 'Pedro Oliveira', phone: '(11) 95432-1098' },
    { name: 'Mariana Costa', phone: '(11) 94321-0987' },
    { name: 'Thiago Alves', phone: '(11) 93210-9876' },
    { name: 'Beatriz Lima', phone: '(11) 92109-8765' },
    { name: 'Diego Mendes', phone: '(11) 91098-7654' },
  ];

  const bookingsPayload: any[] = [];
  const today = new Date();

  for (let daysAgo = 0; daysAgo <= 30; daysAgo++) {
    const date = new Date(today);
    date.setDate(today.getDate() - daysAgo);
    const dow = date.getDay();
    if (dow === 0) continue; // pula domingo

    const hours = [8, 9, 10, 11, 14, 15, 16, 17, 18, 19];
    for (const h of hours) {
      for (const res of resources) {
        if (Math.random() > 0.35) continue;
        const customer = customers[Math.floor(Math.random() * customers.length)]!;
        const isBeach = res.type === 'beach_tennis';
        const serviceSel = isBeach ? svcBeach : svc;
        if (!serviceSel) continue;
        const startAt = new Date(date);
        startAt.setHours(h, 0, 0, 0);
        const endAt = new Date(startAt);
        endAt.setMinutes(60);
        const isPast = startAt < today;
        const method = Math.random() > 0.5 ? 'pix_upfront' : 'pay_on_site';
        bookingsPayload.push({
          tenant_id: tenant.id,
          resource_id: res.id,
          service_id: serviceSel.id,
          customer_name: customer.name,
          customer_phone: customer.phone,
          starts_at: startAt.toISOString(),
          ends_at: endAt.toISOString(),
          total_cents: serviceSel.base_price_cents,
          status: isPast ? 'confirmed' : (Math.random() > 0.8 ? 'pending_approval' : 'confirmed'),
          payment_method: method,
          confirmed_at: isPast ? startAt.toISOString() : null,
        });
      }
    }
  }

  // Insere em batches de 50
  let inserted = 0;
  for (let i = 0; i < bookingsPayload.length; i += 50) {
    const batch = bookingsPayload.slice(i, i + 50);
    const { data: bks } = await admin.from('bookings').insert(batch).select('id, payment_method, total_cents, confirmed_at');
    inserted += bks?.length || 0;

    // Payments para pix_upfront confirmados
    const paymentsPayload = (bks || [])
      .filter((b: any) => b.payment_method === 'pix_upfront' && b.confirmed_at)
      .map((b: any) => ({
        booking_id: b.id,
        provider: 'validapay',
        amount_cents: b.total_cents,
        status: 'paid',
        paid_at: b.confirmed_at,
      }));
    if (paymentsPayload.length) {
      await admin.from('payments').insert(paymentsPayload);
    }
  }

  return {
    ok: true,
    tenant: tenant.name,
    resources: resources.length,
    services: services?.length || 0,
    scheduleRules: rulesPayload.length,
    bookings: inserted,
  };
});
