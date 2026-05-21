import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { H3Event } from 'h3';
import { serverSupabaseClient } from '#supabase/server';

let _serviceRoleClient: SupabaseClient | null = null;

export async function createSupabaseAdmin(event?: H3Event) {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error('SUPABASE_URL não configurado.');

  const isValid = serviceKey && serviceKey.length > 100 && !serviceKey.startsWith('COLE_');
  if (isValid) {
    if (!_serviceRoleClient) {
      _serviceRoleClient = createClient(url, serviceKey!, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
    }
    return _serviceRoleClient;
  }
  if (event) return serverSupabaseClient(event);
  throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurado.');
}
