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
  const parsed = serverEnvironmentSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    VERNEX_ADMIN_SECRET: process.env.VERNEX_ADMIN_SECRET,
  });
  if (!parsed.success) {
    const missing = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new Error(`Vernex server configuration is incomplete. Check: ${missing}`);
  }
  cachedEnvironment = parsed.data;
  return cachedEnvironment;
}
