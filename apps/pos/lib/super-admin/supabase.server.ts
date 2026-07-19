import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { getServerEnvironment } from '@/lib/super-admin/env.server';

export function createServerSupabase(accessToken?: string) {
  const env = getServerEnvironment();
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined,
  });
}

export function createPrivilegedSupabase() {
  const env = getServerEnvironment();
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Privileged Supabase integration is not configured.');
  }
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

