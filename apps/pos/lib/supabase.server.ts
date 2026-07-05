import 'server-only';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getServerEnvironment } from '@/lib/env.server';

declare global {
  var vernexServerSupabase: SupabaseClient | undefined;
}

export function getServerSupabase() {
  const environment = getServerEnvironment();
  if (!globalThis.vernexServerSupabase) {
    globalThis.vernexServerSupabase = createClient(
      environment.NEXT_PUBLIC_SUPABASE_URL,
      environment.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { auth: { persistSession: false } }
    );
  }
  return globalThis.vernexServerSupabase;
}

