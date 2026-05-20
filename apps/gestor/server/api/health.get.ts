import { createSupabaseAdmin } from '../utils/supabase-admin';

// GET /api/health — diagnóstico rápido (sem expor segredos)
export default defineEventHandler(async () => {
  const hasSupabase = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  const hasSupabaseAnon = !!(process.env.SUPABASE_URL && (process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY));
  const mockAuth = process.env.MOCK_AUTH === '1';

  let dbOk = false;
  let dbError: string | undefined;

  if (hasSupabase) {
    try {
      const admin = createSupabaseAdmin();
      const { error } = await admin.from('tenants').select('id').limit(1);
      if (error) throw new Error(error.message);
      dbOk = true;
    } catch (e: unknown) {
      dbError = e instanceof Error ? e.message : String(e);
    }
  }

  return {
    ok: hasSupabaseAnon && dbOk,
    mockAuth,
    env: {
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasSupabaseKey: hasSupabaseAnon,
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasValidapay: !!(process.env.VALIDAPAY_ACCESS_TOKEN || process.env.VALIDAPAY_CLIENT_ID),
      hasAbacatepay: !!process.env.ABACATEPAY_API_KEY,
      nodeEnv: process.env.NODE_ENV,
      vercel: !!process.env.VERCEL,
    },
    db: { ok: dbOk, error: dbError },
  };
});
