import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requestUsesHttps, setSessionCookie } from '@/lib/session-cookie';
import { authErrorResponse, getCurrentUserContext } from '@/lib/auth';
import { signInWithUserId } from '@/lib/user-id-auth';

const loginSchema = z.object({
  userId: z.string().trim().min(1),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid User ID or password.' }, { status: 400 });
  }
  const session = await signInWithUserId(parsed.data.userId, parsed.data.password);
  if (!session) {
    return NextResponse.json({ error: 'Invalid User ID or password.' }, { status: 401 });
  }
  try {
    await getCurrentUserContext(new Request(request.url, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    }));
  } catch (profileError) {
    const response = authErrorResponse(profileError);
    if (response) return response;
    return NextResponse.json({ error: 'Unable to verify your account. Please try again.' }, { status: 500 });
  }
  const response = NextResponse.json({ success: true });
  setSessionCookie(response, session.access_token, session.expires_in, requestUsesHttps(request));
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
