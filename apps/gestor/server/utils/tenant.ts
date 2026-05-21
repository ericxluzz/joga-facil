import { serverSupabaseUser } from '#supabase/server';
import { createSupabaseAdmin, mapTenant } from './supabase-admin';
import { H3Event } from 'h3';

export async function getActiveTenant(event: H3Event) {
  const admin = await createSupabaseAdmin(event);

  if (process.env.MOCK_AUTH === '1') {
    const { data: rows } = await admin.from('tenants').select('*').limit(1);
    if (rows?.[0]) return mapTenant(rows[0]);

    const defaultSettings = {
      requireRegistration: false,
      acceptPayOnSite: true,
      minAdvanceMinutes: 60,
      maxAdvanceDays: 30,
      holdMinutes: 10,
      payOnSiteTimeoutMinutes: 60,
      cancellationPolicy: 'Cancelamentos com mais de 24h de antecedência são reembolsados integralmente.',
    };

    const { data: created } = await admin
      .from('tenants')
      .insert({
        slug: 'meu-society',
        name: 'Meu Society',
        type: 'society',
        settings: defaultSettings,
      })
      .select()
      .single();

    return created ? mapTenant(created) : null;
  }

  let user;
  try {
    user = await serverSupabaseUser(event);
  } catch {
    throw createError({
      statusCode: 503,
      message: 'Auth indisponível — verifique SUPABASE_URL e SUPABASE_KEY na Vercel',
    });
  }
  if (!user) {
    throw createError({ statusCode: 401, message: 'Não autorizado' });
  }

  const { data: links } = await admin
    .from('tenant_users')
    .select('tenant_id')
    .eq('user_id', user.id)
    .limit(1);

  if (!links?.[0]) return null;

  const { data: tenant } = await admin
    .from('tenants')
    .select('*')
    .eq('id', (links[0] as any).tenant_id)
    .single();

  return tenant ? mapTenant(tenant) : null;
}
