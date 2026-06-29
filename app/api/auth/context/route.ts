import { authErrorResponse, requireAuth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const ctx = await requireAuth(request);
    return NextResponse.json({ user: ctx });
  } catch (error) {
    const response = authErrorResponse(error);
    if (response) return response;
    return NextResponse.json({ error: 'Unable to load auth context.' }, { status: 500 });
  }
}

