import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requestUsesHttps, setSessionCookies } from '@/lib/session-cookie';
import { authErrorResponse, getCurrentUserContext } from '@/lib/auth';
import { signInWithUserId } from '@/lib/user-id-auth';
import { isSuperAdminEmail, SUPER_ADMIN_ROUTE } from '@/lib/super-admin/session';

const loginSchema = z.object({
  userId: z.string().trim().min(1),
  password: z.string().min(1),
});

// Business roles land on a page they can actually open: OWNER/MANAGER on the
// dashboard, CASHIER/WORKER on POS Billing.
function posLandingPath(role?: string) {
  return role === 'OWNER' || role === 'MANAGER' ? '/home' : '/orders';
}

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid User ID or password.' }, { status: 400 });
  }
  const session = await signInWithUserId(parsed.data.userId, parsed.data.password);
  if (!session) {
    return NextResponse.json({ error: 'Invalid User ID or password.' }, { status: 401 });
  }

  // Platform Super Admin: they have no StaffProfile, so skip the POS workspace
  // check and route them to the merged Super Admin section. Authentication has
  // already succeeded above, so a matching email confirms their identity.
  if (isSuperAdminEmail(parsed.data.userId)) {
    const response = NextResponse.json({ success: true, redirect: SUPER_ADMIN_ROUTE });
    setSessionCookies(response, { accessToken: session.access_token, refreshToken: session.refresh_token }, requestUsesHttps(request));
    response.headers.set('Cache-Control', 'no-store');
    return response;
  }

  let role: string | undefined;
  try {
    const ctx = await getCurrentUserContext(new Request(request.url, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    }));
    role = ctx.role;
  } catch (profileError) {
    const response = authErrorResponse(profileError);
    if (response) return response;
    return NextResponse.json({ error: 'Unable to verify your account. Please try again.' }, { status: 500 });
  }
  const response = NextResponse.json({ success: true, redirect: posLandingPath(role) });
  setSessionCookies(response, { accessToken: session.access_token, refreshToken: session.refresh_token }, requestUsesHttps(request));
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
