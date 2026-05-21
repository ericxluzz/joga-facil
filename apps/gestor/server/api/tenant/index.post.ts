import { serverSupabaseUser, serverSupabaseClient } from '#supabase/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseAdmin, mapTenant } from '../../utils/supabase-admin';

const defaultTenantSettings = {
  requireRegistration: false,
  acceptPayOnSite: true,
  minAdvanceMinutes: 60,
  maxAdvanceDays: 30,
  holdMinutes: 10,
  payOnSiteTimeoutMinutes: 60,
  cancellationPolicy: 'Cancelamentos com mais de 24h de antecedência são reembolsados integralmente.',
};

function hasServiceRoleKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return !!(key && key.length > 100 && !key.startsWith('COLE_'));
}

async function createTenantWithAdmin(
  admin: Awaited<ReturnType<typeof createSupabaseAdmin>>,
  params: {
    userId: string;
    userEmail: string;
    fullName: string | null;
    slug: string;
    name: string;
    type: string;
    settings: Record<string, unknown>;
    trialEndsAt: string;
  },
) {
  const { data: existingLink } = await admin
    .from('tenant_users')
    .select('tenant_id')
    .eq('user_id', params.userId)
    .maybeSingle();

  if (existingLink?.tenant_id) {
    throw createError({ statusCode: 409, message: 'Usuário já possui um estabelecimento' });
  }

  const { data: slugRow } = await admin.from('tenants').select('id').eq('slug', params.slug).maybeSingle();
  if (slugRow?.id) {
    throw createError({ statusCode: 409, message: 'Esse slug já está em uso' });
  }

  await admin.from('users').upsert({
    id: params.userId,
    email: params.userEmail,
    full_name: params.fullName,
  });

  const { data: tenantRow, error: tenantError } = await admin
    .from('tenants')
    .insert({
      slug: params.slug,
      name: params.name,
      type: params.type,
      settings: params.settings,
      plan: 'trial',
      trial_ends_at: params.trialEndsAt,
    })
    .select()
    .single();

  if (tenantError) {
    if (tenantError.message?.includes('duplicate') || tenantError.code === '23505') {
      throw createError({ statusCode: 409, message: 'Esse slug já está em uso' });
    }
    throw createError({ statusCode: 500, message: tenantError.message });
  }

  const { error: linkError } = await admin.from('tenant_users').insert({
    tenant_id: tenantRow.id,
    user_id: params.userId,
    role: 'owner',
  });

  if (linkError) {
    throw createError({ statusCode: 500, message: linkError.message });
  }

  return mapTenant(tenantRow as Record<string, unknown>);
}

async function createTenantWithRpc(
  rpcClient: Awaited<ReturnType<typeof serverSupabaseClient>>,
  params: {
    userId: string;
    userEmail: string;
    fullName: string | null;
    slug: string;
    name: string;
    type: string;
    settings: Record<string, unknown>;
    trialEndsAt: string;
  },
) {
  const { data: tenantJson, error: rpcError } = await rpcClient.rpc('create_tenant_for_user', {
    p_user_id: params.userId,
    p_user_email: params.userEmail,
    p_full_name: params.fullName,
    p_slug: params.slug,
    p_name: params.name,
    p_type: params.type,
    p_settings: params.settings,
    p_plan: 'trial',
    p_trial_ends_at: params.trialEndsAt,
  });

  if (rpcError) {
    if (rpcError.message?.includes('SLUG_TAKEN')) {
      throw createError({ statusCode: 409, message: 'Esse slug já está em uso' });
    }
    if (rpcError.message?.includes('USER_HAS_TENANT')) {
      throw createError({ statusCode: 409, message: 'Usuário já possui um estabelecimento' });
    }
    throw createError({ statusCode: 500, message: rpcError.message });
  }

  return mapTenant(tenantJson as Record<string, unknown>);
}

// POST /api/tenant — cria tenant a partir do onboarding
export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const user = await serverSupabaseUser(event).catch(() => null);

  if (!user) {
    throw createError({ statusCode: 401, message: 'Não autorizado — faça login antes de criar um estabelecimento' });
  }

  if (!body.name || !body.slug) {
    throw createError({ statusCode: 400, message: 'name e slug são obrigatórios' });
  }

  const mergedSettings = {
    ...defaultTenantSettings,
    ...(body.settings || {}),
    whatsapp: body.whatsapp,
  };

  const params = {
    userId: user.id,
    userEmail: user.email || `${user.id}@noemail.local`,
    fullName: (user.user_metadata as { full_name?: string })?.full_name || null,
    slug: body.slug as string,
    name: body.name as string,
    type: (body.type as string) || 'society',
    settings: mergedSettings,
    trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
  };

  let tenant;

  if (hasServiceRoleKey()) {
    const admin = await createSupabaseAdmin(event);
    tenant = await createTenantWithAdmin(admin, params);
  } else {
    let rpcClient: Awaited<ReturnType<typeof serverSupabaseClient>>;
    try {
      rpcClient = await serverSupabaseClient(event);
    } catch {
      rpcClient = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY!,
        { auth: { persistSession: false, autoRefreshToken: false } },
      ) as Awaited<ReturnType<typeof serverSupabaseClient>>;
    }
    tenant = await createTenantWithRpc(rpcClient, params);
  }

  if (body.resources?.length || body.services?.length || body.scheduleRules?.length) {
    const admin = await createSupabaseAdmin(event);

    const resourcesPayload = (body.resources || [])
      .filter((r: { name?: string }) => r?.name)
      .map((r: { name: string; type?: string }) => ({
        tenant_id: tenant.id,
        name: r.name,
        type: r.type || tenant.type,
      }));

    let insertedResources: { id: string }[] = [];
    if (resourcesPayload.length) {
      const { data: res } = await admin.from('resources').insert(resourcesPayload).select();
      insertedResources = res || [];
    }

    const servicesPayload = (body.services || [])
      .filter((s: { name?: string }) => s?.name)
      .map((s: {
        name: string;
        durationMinutes?: number;
        priceCents?: number;
        basePriceCents?: number;
      }) => ({
        tenant_id: tenant.id,
        name: s.name,
        duration_minutes: s.durationMinutes || 60,
        base_price_cents: Math.round(s.priceCents ?? s.basePriceCents ?? 10000),
      }));
    if (servicesPayload.length) {
      await admin.from('services').insert(servicesPayload);
    }

    const rulesPayload = (body.scheduleRules || []).flatMap((rule: {
      weekdays?: number[];
      weekday?: number;
      startTime?: string;
      endTime?: string;
      priceModifier?: number;
    }) => {
      const weekdaysList: number[] = Array.isArray(rule.weekdays)
        ? rule.weekdays
        : rule.weekday !== undefined
          ? [rule.weekday]
          : [];
      return weekdaysList.flatMap((weekday) =>
        insertedResources.map((r) => ({
          tenant_id: tenant.id,
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
  }

  return tenant;
});
