import { createSupabaseAdmin } from '../../utils/supabase-admin';

const SETTINGS_ID = '00000000-0000-0000-0000-000000000001';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const admin = await createSupabaseAdmin(event);

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (typeof body.defaultPlatformFeeCents === 'number') patch.default_platform_fee_cents = body.defaultPlatformFeeCents;
  if (typeof body.pixExpirationMinutes === 'number') patch.pix_expiration_minutes = body.pixExpirationMinutes;
  if (body.validapayEnv === 'sandbox' || body.validapayEnv === 'production') patch.validapay_env = body.validapayEnv;
  if (typeof body.maintenanceMode === 'boolean') patch.maintenance_mode = body.maintenanceMode;

  await admin.from('platform_settings').update(patch).eq('id', SETTINGS_ID);

  return { ok: true };
});
