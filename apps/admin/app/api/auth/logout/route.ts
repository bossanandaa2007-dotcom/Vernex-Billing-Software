import { NextResponse } from 'next/server';
import { adminCookieName } from '@/lib/auth.server';

export async function POST(request: Request) {
  const response = NextResponse.json({ success: true });
  response.cookies.set(adminCookieName, '', {
    httpOnly: true,
    secure: new URL(request.url).protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

