import 'server-only';
import { z } from 'zod';

const serverEnvironmentSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  VERNEX_ADMIN_SECRET: z.string().min(24),
});

let cachedEnvironment: z.infer<typeof serverEnvironmentSchema> | null = null;

export function getServerEnvironment() {
  if (cachedEnvironment) return cachedEnvironment;
  const databaseUrl = process.env.DATABASE_URL;
  let derivedSupabaseUrl: string | undefined;
  if (databaseUrl) {
    try {
      const databaseUser = new URL(databaseUrl).username;
      const projectRef = databaseUser.startsWith('postgres.')
        ? databaseUser.slice('postgres.'.length)
        : undefined;
      if (projectRef) derivedSupabaseUrl = `https://${projectRef}.supabase.co`;
    } catch {
      // Validation below reports an actionable configuration error.
    }
  }
  const parsed = serverEnvironmentSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? derivedSupabaseUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.DATABASE_ANON_KEY,
    // Keep local POS authentication usable when the optional activation endpoint
    // is not configured. This value cannot authorize the remote platform function.
    VERNEX_ADMIN_SECRET:
      process.env.VERNEX_ADMIN_SECRET ?? 'local-development-secret-disabled',
  });
  if (!parsed.success) {
    const missing = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new Error(`Vernex server configuration is incomplete. Check: ${missing}`);
  }
  cachedEnvironment = parsed.data;
  return cachedEnvironment;
}
