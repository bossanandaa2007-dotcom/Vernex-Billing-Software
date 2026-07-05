import { NextResponse, type NextRequest } from 'next/server';
import { sessionCookieName } from '@/lib/session-cookie';

const protectedPrefixes = ['/home', '/orders', '/product', '/records', '/analytics', '/settings', '/customers', '/inventory', '/staff', '/audit-logs'];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isProtected = protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (!isProtected || process.env.NODE_ENV !== 'production') return NextResponse.next();

  const token = request.cookies.get(sessionCookieName)?.value;
  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return NextResponse.redirect(new URL('/login', request.url));

  try {
    const verification = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });
    if (verification.ok) return NextResponse.next();
  } catch {}

  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.searchParams.set('message', 'session-expired');
  const response = NextResponse.redirect(url);
  response.cookies.delete(sessionCookieName);
  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|icon.png|apple-icon.png).*)'],
};
