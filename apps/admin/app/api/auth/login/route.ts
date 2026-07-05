import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabase } from '@/lib/supabase.server';
import { getServerEnvironment } from '@/lib/env.server';
import { adminCookieName } from '@/lib/auth.server';

const schema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Enter your email and password.' }, { status: 400 });
  }
  if (parsed.data.email.toLowerCase() !== getServerEnvironment().SUPER_ADMIN_EMAIL.toLowerCase()) {
    return NextResponse.json({ error: 'The email or password is incorrect.' }, { status: 401 });
  }
  const { data, error } = await createServerSupabase().auth.signInWithPassword(parsed.data);
  if (error || !data.session || data.user.email?.toLowerCase() !== parsed.data.email.toLowerCase()) {
    return NextResponse.json({ error: 'The email or password is incorrect.' }, { status: 401 });
  }
  const response = NextResponse.json({ success: true });
  response.cookies.set(adminCookieName, data.session.access_token, {
    httpOnly: true,
    secure: new URL(request.url).protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https',
    sameSite: 'strict',
    path: '/',
    maxAge: data.session.expires_in,
  });
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

