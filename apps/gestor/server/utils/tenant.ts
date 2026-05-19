import { serverSupabaseUser } from '#supabase/server';
import { db } from '@agendaslim/db/client';
import { tenantUsers, tenants } from '@agendaslim/db/schema';
import { eq } from 'drizzle-orm';
import { H3Event } from 'h3';

export async function getActiveTenant(event: H3Event) {
  if (process.env.MOCK_AUTH === '1') {
    const allTenants = await db.select().from(tenants).limit(1);
    if (allTenants[0]) {
      return allTenants[0];
    }
    
    // Create a mock tenant in the database if empty
    const [newTenant] = await db
      .insert(tenants)
      .values({
        slug: 'meu-society',
        name: 'Meu Society',
        type: 'society',
        settings: {
          requireRegistration: false,
          acceptPayOnSite: true,
          minAdvanceMinutes: 60,
          maxAdvanceDays: 30,
          holdMinutes: 10,
          payOnSiteTimeoutMinutes: 60,
          cancellationPolicy: 'Cancelamentos com mais de 24h de antecedência são reembolsados integralmente.',
        },
      })
      .returning();
    return newTenant;
  }

  let user;
  try {
    user = await serverSupabaseUser(event);
  } catch {
    throw createError({ statusCode: 503, message: 'Auth indisponível — verifique SUPABASE_URL e SUPABASE_KEY na Vercel' });
  }
  if (!user) {
    throw createError({ statusCode: 401, message: 'Não autorizado' });
  }

  const links = await db
    .select()
    .from(tenantUsers)
    .where(eq(tenantUsers.userId, user.id))
    .limit(1);

  if (!links[0]) {
    return null;
  }

  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, links[0].tenantId))
    .limit(1);

  return tenant || null;
}
