import { NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { adminCookieName, requireSuperAdmin } from '@/lib/auth.server';
import { createServerSupabase } from '@/lib/supabase.server';

const schema = z.object({ password: z.string().min(10) });

export async function PATCH(request: Request) {
  await requireSuperAdmin();
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Use at least 10 characters for the new password.' }, { status: 400 });
  const token = (await cookies()).get(adminCookieName)?.value;
  if (!token) return NextResponse.json({ error: 'Your session has expired.' }, { status: 401 });
  const { error } = await createServerSupabase(token).auth.updateUser({ password: parsed.data.password });
  if (error) return NextResponse.json({ error: 'Unable to change password. Please sign in again.' }, { status: 400 });
  return NextResponse.json({ success: true });
}

