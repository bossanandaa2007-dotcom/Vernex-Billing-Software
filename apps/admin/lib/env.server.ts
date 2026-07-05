import 'server-only';
import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  VERNEX_ADMIN_SECRET: z.string().min(24),
  SUPER_ADMIN_EMAIL: z.string().email(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),
});

let cached: z.infer<typeof schema> | null = null;

export function getServerEnvironment() {
  if (cached) return cached;
  const parsed = schema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    VERNEX_ADMIN_SECRET: process.env.VERNEX_ADMIN_SECRET,
    SUPER_ADMIN_EMAIL: process.env.SUPER_ADMIN_EMAIL,
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
