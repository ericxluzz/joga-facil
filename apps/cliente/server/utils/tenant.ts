// Resolve tenant a partir do slug público (sem auth — landing pública)
import { createSupabaseAdmin, mapTenant } from './supabase-admin';

export async function getTenantBySlug(slug: string) {
  const admin = createSupabaseAdmin();
  const { data: row } = await admin.from('tenants').select('*').eq('slug', slug).single();
  return row ? mapTenant(row) : null;
}
