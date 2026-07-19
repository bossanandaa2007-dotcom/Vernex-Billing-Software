import 'server-only';
import { z } from 'zod';

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  VERNEX_ADMIN_SECRET: z.string().min(24),
  SUPER_ADMIN_EMAIL: z.string().email(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),
});

let cached: z.infer<typeof schema> | null = null;

export function getServerEnvironment() {
  if (cached) return cached;
  let derivedSupabaseUrl: string | undefined;
  if (process.env.DATABASE_URL) {
    try {
      const username = new URL(process.env.DATABASE_URL).username;
      if (username.startsWith('postgres.')) {
        derivedSupabaseUrl = `https://${username.slice('postgres.'.length)}.supabase.co`;
      }
    } catch {
      // Schema validation below reports invalid or missing configuration.
    }
  }
  const parsed = schema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? derivedSupabaseUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.DATABASE_ANON_KEY,
    VERNEX_ADMIN_SECRET:
      process.env.VERNEX_ADMIN_SECRET ?? 'local-development-secret-disabled',
    SUPER_ADMIN_EMAIL: process.env.SUPER_ADMIN_EMAIL ?? 'sivasanthosh1776@gmail.com',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
  if (!parsed.success) {
    throw new Error(
      `Super Admin configuration is incomplete: ${parsed.error.issues
        .map((issue) => issue.path.join('.'))
        .join(', ')}`
    );
  }
  cached = parsed.data;
  return cached;
}
