import { createSupabaseAdmin, mapTenant, mapResource, mapService } from '../../../utils/supabase-admin';

// GET /api/r/[slug] — dados públicos do estabelecimento
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug');
  if (!slug) throw createError({ statusCode: 400, message: 'slug obrigatório' });

  const admin = createSupabaseAdmin();

  const { data: tenantRow } = await admin.from('tenants').select('*').eq('slug', slug).single();
  if (!tenantRow) throw createError({ statusCode: 404, message: 'Estabelecimento não encontrado' });

  const tenant = mapTenant(tenantRow);

  const [resourceRows, serviceRows, scheduleRows, paymentAccountRow] = await Promise.all([
    admin.from('resources').select('*').eq('tenant_id', tenant.id).eq('active', true).then((r) => r.data),
    admin.from('services').select('*').eq('tenant_id', tenant.id).then((r) => r.data),
    admin.from('schedule_rules').select('start_time,end_time,weekday').eq('tenant_id', tenant.id).then((r) => r.data),
    admin.from('tenant_payment_accounts').select('status, validapay_account_number').eq('tenant_id', tenant.id).maybeSingle().then((r) => r.data),
  ]);

  // Calcula horário de abertura/fechamento do dia atual (usando SP timezone)
  const nowSP = new Date(new Date().toLocaleString('en-US', { timeZone: tenant.timezone || 'America/Sao_Paulo' }));
  const todayWeekday = nowSP.getDay(); // 0=Dom … 6=Sáb
  const todayRules = (scheduleRows || []).filter((r: any) => r.weekday === todayWeekday);

  let openTime: string | null = null;
  let closeTime: string | null = null;
  if (todayRules.length > 0) {
    openTime = todayRules.reduce((min: string, r: any) => (r.start_time < min ? r.start_time : min), todayRules[0].start_time);
    closeTime = todayRules.reduce((max: string, r: any) => (r.end_time > max ? r.end_time : max), todayRules[0].end_time);
  }

  return {
    id: tenant.id,
    slug: tenant.slug,
    name: tenant.name,
    address: tenant.address,
    description: tenant.settings?.description,
    photoUrl: tenant.photoUrl,
    whatsapp: tenant.settings?.whatsapp,
    instagram: tenant.settings?.instagram,
    cancellationPolicy: tenant.settings?.cancellationPolicy || 'Cancelamentos com mais de 24h de antecedência são reembolsados integralmente.',
    settings: tenant.settings,
    resources: (resourceRows || []).map(mapResource),
    services: (serviceRows || []).map(mapService),
    openTime,   // "08:00:00" ou null
    closeTime,  // "22:00:00" ou null
    // KYC status: 'approved' means PIX is available; anything else falls back to pay_on_site only
    kycStatus: (paymentAccountRow as any)?.status || null,
    pixAvailable:
      (paymentAccountRow as any)?.status === 'approved' || process.env.MOCK_PAYMENTS === '1',
  };
});
