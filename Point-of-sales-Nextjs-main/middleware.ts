import { NextResponse, type NextRequest } from 'next/server';

const protectedPrefixes = ['/home', '/orders', '/product', '/records', '/analytics', '/settings', '/customers', '/inventory', '/staff', '/audit-logs'];

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isProtected = protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (!isProtected || process.env.NODE_ENV !== 'production') return NextResponse.next();

  const token = request.cookies.get('vernex-access-token')?.value;
  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|icon.png|apple-icon.png).*)'],
};

