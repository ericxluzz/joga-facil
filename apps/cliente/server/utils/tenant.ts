// Resolve tenant a partir do slug público (sem auth — landing pública)
import { createSupabaseAdmin, mapTenant } from './supabase-admin';

const _tenantCache = new Map<string, { v: ReturnType<typeof mapTenant>; exp: number }>();
const TENANT_TTL_MS = 30_000;

export async function getTenantBySlug(slug: string) {
  const hit = _tenantCache.get(slug);
  if (hit && hit.exp > Date.now()) return hit.v;

  const admin = createSupabaseAdmin();
  const { data: row } = await admin.from('tenants').select('*').eq('slug', slug).single();
  const tenant = row ? mapTenant(row) : null;

  if (tenant) {
    _tenantCache.set(slug, { v: tenant, exp: Date.now() + TENANT_TTL_MS });
  }
  return tenant;
}

export function invalidateTenantCache(slug: string) {
  _tenantCache.delete(slug);
}
