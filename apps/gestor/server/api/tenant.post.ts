import { serverSupabaseUser } from '#supabase/server';
import { db } from '@agendaslim/db/client';
import { tenants, tenantUsers, users, defaultTenantSettings } from '@agendaslim/db/schema';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  
  let userId: string;
  if (process.env.MOCK_AUTH === '1') {
    userId = '00000000-0000-0000-0000-000000000000';
    const existing = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!existing[0]) {
      await db.insert(users).values({
        id: userId,
        email: 'mock@example.com',
        fullName: 'Usuário de Teste',
      });
    }
  } else {
    const supabaseUser = await serverSupabaseUser(event);
    if (!supabaseUser) {
      throw createError({ statusCode: 401, message: 'Não autorizado' });
    }
    userId = supabaseUser.id;
    const existing = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!existing[0]) {
      await db.insert(users).values({
        id: userId,
        email: supabaseUser.email || '',
        fullName: supabaseUser.user_metadata?.full_name || '',
      });
    }
  }

  const [newTenant] = await db
    .insert(tenants)
    .values({
      slug: body.slug,
      name: body.name,
      type: body.type || 'society',
      address: body.address || null,
      settings: {
        ...defaultTenantSettings,
        whatsapp: body.whatsapp || undefined,
        instagram: body.instagram || undefined,
      },
    })
    .returning();

  await db.insert(tenantUsers).values({
    tenantId: newTenant.id,
    userId: userId,
    role: 'owner',
  });

  return newTenant;
});
