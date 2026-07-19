import type { NextResponse } from 'next/server';

export const sessionCookieName = 'vernex-access-token';
export const refreshCookieName = 'vernex-refresh-token';

// Rolling session lifetime. It is reset on every login and every token refresh,
// so an actively-used session effectively never expires — only ~30 days of
// inactivity, or an explicit logout, ends it. The short-lived Supabase access
// token inside the cookie is renewed automatically by the middleware using the
// refresh token, so the login survives browser restarts.
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function base(secure: boolean) {
  return { httpOnly: true as const, sameSite: 'lax' as const, secure, path: '/' as const };
}

export function setSessionCookies(
  response: NextResponse,
  tokens: { accessToken: string; refreshToken?: string | null },
  secure: boolean
) {
  response.cookies.set(sessionCookieName, tokens.accessToken, { ...base(secure), maxAge: SESSION_MAX_AGE });
  if (tokens.refreshToken) {
    response.cookies.set(refreshCookieName, tokens.refreshToken, { ...base(secure), maxAge: SESSION_MAX_AGE });
  }
}

// Access-token-only setter, used by the browser session-exchange route.
export function setSessionCookie(response: NextResponse, token: string, secure: boolean) {
  response.cookies.set(sessionCookieName, token, { ...base(secure), maxAge: SESSION_MAX_AGE });
}

export function clearSessionCookie(response: NextResponse, secure: boolean) {
  response.cookies.set(sessionCookieName, '', { ...base(secure), maxAge: 0 });
  response.cookies.set(refreshCookieName, '', { ...base(secure), maxAge: 0 });
}

export function requestUsesHttps(request: Request) {
  const forwarded = request.headers.get('x-forwarded-proto');
  return forwarded ? forwarded === 'https' : new URL(request.url).protocol === 'https:';
}
