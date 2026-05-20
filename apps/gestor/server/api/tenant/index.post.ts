import { serverSupabaseUser } from '#supabase/server';
import { createSupabaseAdmin, mapTenant } from '../../utils/supabase-admin';
import { defaultTenantSettings } from '@agendaslim/db/schema';

// POST /api/tenant — cria tenant a partir do onboarding (5 passos)
export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const user = await serverSupabaseUser(event).catch(() => null);

  if (!user && process.env.MOCK_AUTH !== '1') {
    throw createError({ statusCode: 401, message: 'Não autorizado' });
  }

  if (!body.name || !body.slug) {
    throw createError({ statusCode: 400, message: 'name e slug são obrigatórios' });
  }

  const admin = createSupabaseAdmin();

  // Slug duplicado?
  const { data: existing } = await admin
    .from('tenants')
    .select('id')
    .eq('slug', body.slug)
    .limit(1);
  if (existing?.length) {
    throw createError({ statusCode: 409, message: 'Esse slug já está em uso' });
  }

  const mergedSettings = {
    ...defaultTenantSettings,
    ...(body.settings || {}),
    whatsapp: body.whatsapp,
  };

  // 1. Tenant
  const { data: tenant, error: tenantError } = await admin
    .from('tenants')
    .insert({
      slug: body.slug,
      name: body.name,
      type: body.type || 'society',
      photo_url: body.photoUrl ?? null,
      address: [body.address, body.addressNumber].filter(Boolean).join(', ') || body.address || null,
      settings: mergedSettings,
      plan: 'trial',
      status: 'active',
      trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single();

  if (tenantError) throw createError({ statusCode: 500, message: tenantError.message });

  // 2. User vínculo
  if (user) {
    await admin.from('users').upsert(
      { id: user.id, email: user.email || `${user.id}@noemail.local`, full_name: (user.user_metadata as any)?.full_name },
      { onConflict: 'id', ignoreDuplicates: true },
    );
    await admin.from('tenant_users').insert({ tenant_id: tenant!.id, user_id: user.id, role: 'owner' });
  }

  // 3. Resources
  const resourcesPayload = (body.resources || [])
    .filter((r: any) => r?.name)
    .map((r: any) => ({ tenant_id: tenant!.id, name: r.name, type: r.type || tenant!.type }));

  let insertedResources: any[] = [];
  if (resourcesPayload.length) {
    const { data: res } = await admin.from('resources').insert(resourcesPayload).select();
    insertedResources = res || [];
  }

  // 4. Services
  const servicesPayload = (body.services || [])
    .filter((s: any) => s?.name)
    .map((s: any) => ({
      tenant_id: tenant!.id,
      name: s.name,
      duration_minutes: s.durationMinutes || 60,
      base_price_cents: Math.round(s.priceCents ?? s.basePriceCents ?? 10000),
    }));
  if (servicesPayload.length) {
    await admin.from('services').insert(servicesPayload);
  }

  // 5. Schedule rules
  const rulesPayload = (body.scheduleRules || []).flatMap((rule: any) => {
    const weekdaysList: number[] = Array.isArray(rule.weekdays)
      ? rule.weekdays
      : rule.weekday !== undefined
      ? [rule.weekday]
      : [];
    return weekdaysList.flatMap((weekday) =>
      insertedResources.map((r) => ({
        tenant_id: tenant!.id,
        resource_id: r.id,
        weekday,
        start_time: rule.startTime || '08:00',
        end_time: rule.endTime || '22:00',
        price_modifier: String(rule.priceModifier ?? 1.0),
      })),
    );
  });
  if (rulesPayload.length) {
    await admin.from('schedule_rules').insert(rulesPayload);
  }

  return mapTenant(tenant!);
});
