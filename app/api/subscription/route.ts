import { authErrorResponse, requireAuth } from '@/lib/auth';
import { getBusinessSubscriptionStatus } from '@/lib/subscription';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const ctx = await requireAuth(request);
    const subscription = await getBusinessSubscriptionStatus(ctx.businessId);
    const response = NextResponse.json({ subscription });
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch (error) {
    const response = authErrorResponse(error);
    if (response) return response;
    return NextResponse.json({ error: 'Unable to load subscription status.' }, { status: 500 });
  }
}
