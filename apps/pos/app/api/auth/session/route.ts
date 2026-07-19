import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase.server';
import { requestUsesHttps, setSessionCookies } from '@/lib/session-cookie';
import { authErrorResponse, getCurrentUserContext } from '@/lib/auth';

export async function POST(request: Request) {
  const authorization = request.headers.get('authorization') ?? '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!token) {
    return NextResponse.json({ error: 'Unable to verify your account. Please sign in again.' }, { status: 401 });
  }
  const client = getServerSupabase();
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) {
    return NextResponse.json({ error: 'Your session has expired. Please sign in again.' }, { status: 401 });
  }
  try {
    await getCurrentUserContext(new Request(request.url, {
      headers: { Authorization: `Bearer ${token}` },
    }));
  } catch (profileError) {
    const response = authErrorResponse(profileError);
    if (response) return response;
    return NextResponse.json({ error: 'Unable to verify your account. Please try again.' }, { status: 500 });
  }
  const refreshToken = request.headers.get('x-vernex-refresh') || null;
  const response = NextResponse.json({ success: true });
  setSessionCookies(response, { accessToken: token, refreshToken }, requestUsesHttps(request));
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
