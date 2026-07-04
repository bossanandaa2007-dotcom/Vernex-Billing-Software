import { authErrorResponse, requireAuth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const ctx = await requireAuth(request);
    const response = NextResponse.json({ user: ctx });
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch (error) {
    const response = authErrorResponse(error);
    if (response) return response;
    return NextResponse.json({ error: 'Unable to load auth context.' }, { status: 500 });
  }
}
