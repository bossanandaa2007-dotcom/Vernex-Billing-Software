import { createClient, SupabaseClient } from '@supabase/supabase-js';

let browserSupabase: SupabaseClient | undefined;

function credentials() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && key ? { url, key } : null;
}

export function getBrowserSupabase() {
  const config = credentials();
  if (!config) return null;
  browserSupabase ??= createClient(config.url, config.key);
  return browserSupabase;
}
