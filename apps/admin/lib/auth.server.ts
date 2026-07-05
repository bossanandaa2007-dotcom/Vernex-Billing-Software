import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getServerEnvironment } from '@/lib/env.server';
import { createServerSupabase } from '@/lib/supabase.server';

export const adminCookieName = 'vernex-admin-access-token';

export type SuperAdmin = {
  id: string;
  email: string;
};

export async function getSuperAdmin(): Promise<SuperAdmin | null> {
  const token = (await cookies()).get(adminCookieName)?.value;
  if (!token) return null;
  const { data, error } = await createServerSupabase(token).auth.getUser(token);
  const email = data.user?.email?.toLowerCase();
  if (error || !data.user || !email || email !== getServerEnvironment().SUPER_ADMIN_EMAIL.toLowerCase()) {
    return null;
  }
  return { id: data.user.id, email };
}

export async function requireSuperAdmin() {
  const admin = await getSuperAdmin();
  if (!admin) redirect('/login');
  return admin;
}

export async function createAuthenticatedAdminClient() {
  await requireSuperAdmin();
  const token = (await cookies()).get(adminCookieName)?.value;
  if (!token) redirect('/login');
  return createServerSupabase(token);
}
