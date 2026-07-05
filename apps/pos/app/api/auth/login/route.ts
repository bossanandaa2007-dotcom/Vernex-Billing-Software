import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSupabase } from '@/lib/supabase.server';
import { requestUsesHttps, setSessionCookie } from '@/lib/session-cookie';
import { authErrorResponse, getCurrentUserContext } from '@/lib/auth';

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Please enter a valid email and password.' }, { status: 400 });
  }
  const client = getServerSupabase();
  const { data, error } = await client.auth.signInWithPassword(parsed.data);
  if (error || !data.session) {
    return NextResponse.json({ error: 'The email or password is incorrect.' }, { status: 401 });
  }
  try {
    await getCurrentUserContext(new Request(request.url, {
      headers: { Authorization: `Bearer ${data.session.access_token}` },
    }));
  } catch (profileError) {
    const response = authErrorResponse(profileError);
    if (response) return response;
    return NextResponse.json({ error: 'Unable to verify your account. Please try again.' }, { status: 500 });
  }
  const response = NextResponse.json({ success: true });
  setSessionCookie(response, data.session.access_token, data.session.expires_in, requestUsesHttps(request));
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
