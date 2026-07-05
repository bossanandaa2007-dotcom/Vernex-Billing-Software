import 'server-only';
import { db } from '@/lib/db';
import { getServerSupabase } from '@/lib/supabase.server';

export async function signInWithUserId(userId: string, password: string) {
  const staff = await db.staffProfile.findUnique({
    where: { userId: userId.trim().toLowerCase() },
    select: { email: true },
  });

  if (!staff) return null;

  const { data, error } = await getServerSupabase().auth.signInWithPassword({
    email: staff.email,
    password,
  });

  if (error || !data.session) return null;
  return data.session;
}
