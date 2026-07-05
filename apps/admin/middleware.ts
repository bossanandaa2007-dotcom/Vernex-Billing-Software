import { NextRequest, NextResponse } from 'next/server';

const cookieName = 'vernex-admin-access-token';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isLogin = pathname === '/login';
  const token = request.cookies.get(cookieName)?.value;
  if (!token) {
    if (isLogin) return NextResponse.next();
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const allowedEmail = process.env.SUPER_ADMIN_EMAIL?.toLowerCase();
  if (!url || !key || !allowedEmail) return NextResponse.redirect(new URL('/login', request.url));

  try {
    const response = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: key, Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (response.ok) {
      const user = await response.json();
      if (user?.email?.toLowerCase() === allowedEmail) {
        return isLogin ? NextResponse.redirect(new URL('/', request.url)) : NextResponse.next();
      }
    }
  } catch {}

  const response = isLogin
    ? NextResponse.next()
    : NextResponse.redirect(new URL('/login?message=session-expired', request.url));
  response.cookies.delete(cookieName);
  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|icon.png).*)'],
};

