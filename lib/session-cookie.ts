import type { NextResponse } from 'next/server';

export const sessionCookieName = 'vernex-access-token';

export function setSessionCookie(
  response: NextResponse,
  token: string,
  expiresIn: number,
  secure: boolean
) {
  response.cookies.set(sessionCookieName, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: expiresIn,
  });
}

export function clearSessionCookie(response: NextResponse, secure: boolean) {
  response.cookies.set(sessionCookieName, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: 0,
  });
}

export function requestUsesHttps(request: Request) {
  const forwarded = request.headers.get('x-forwarded-proto');
  return forwarded ? forwarded === 'https' : new URL(request.url).protocol === 'https:';
}

