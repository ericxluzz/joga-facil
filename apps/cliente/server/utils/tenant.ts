// Resolve tenant a partir do slug público (sem auth — landing pública)
import { db } from '@agendaslim/db/client';
import { tenants } from '@agendaslim/db/schema';
import { eq } from 'drizzle-orm';

export async function getTenantBySlug(slug: string) {
  const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);
  return tenant || null;
}
