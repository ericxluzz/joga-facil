import { createSupabaseAdmin } from '../../utils/supabase-admin';

const SETTINGS_ID = '00000000-0000-0000-0000-000000000001';

export default defineEventHandler(async (event) => {
  const admin = await createSupabaseAdmin(event);
  const { data } = await admin.from('platform_settings').select('*').eq('id', SETTINGS_ID).maybeSingle();

  return {
    defaultPlatformFeeCents: data?.default_platform_fee_cents ?? 500,
    pixExpirationMinutes: data?.pix_expiration_minutes ?? 15,
    validapayEnv: data?.validapay_env ?? 'sandbox',
    maintenanceMode: data?.maintenance_mode ?? false,
  };
});
