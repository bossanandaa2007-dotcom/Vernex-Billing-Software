import 'server-only';

import { cookies } from 'next/headers';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getServerEnvironment } from '@/lib/env.server';
import { sessionCookieName } from '@/lib/session-cookie';

export async function createServerClient(request?: Request): Promise<SupabaseClient> {
  const environment = getServerEnvironment();
  const authorization = request?.headers.get('authorization');
  const cookieToken = (await cookies()).get(sessionCookieName)?.value;
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : cookieToken;

  return createClient(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
    }
  );
}

export function unwrap<T>(result: { data: T; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}
