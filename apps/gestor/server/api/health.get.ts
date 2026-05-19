// GET /api/health — diagnóstico rápido (sem expor segredos)
export default defineEventHandler(async () => {
  const hasDb = !!process.env.DATABASE_URL;
  const hasSupabase = !!(process.env.SUPABASE_URL && (process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY));
  const mockAuth = process.env.MOCK_AUTH === '1';

  let dbOk = false;
  let dbError: string | undefined;

  if (hasDb) {
    try {
      const { db } = await import('@agendaslim/db/client');
      const { sql } = await import('drizzle-orm');
      await db.execute(sql`SELECT 1`);
      dbOk = true;
    } catch (e: unknown) {
      dbError = e instanceof Error ? e.message : String(e);
    }
  }

  return {
    ok: hasSupabase && (mockAuth || dbOk),
    mockAuth,
    env: {
      hasDatabaseUrl: hasDb,
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasSupabaseKey: !!(process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY),
      nodeEnv: process.env.NODE_ENV,
      vercel: !!process.env.VERCEL,
    },
    db: { ok: dbOk, error: dbError },
  };
});
