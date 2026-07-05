import { NextResponse } from 'next/server';
import { clearSessionCookie, requestUsesHttps } from '@/lib/session-cookie';

export async function POST(request: Request) {
  const response = NextResponse.json({ success: true });
  clearSessionCookie(response, requestUsesHttps(request));
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

