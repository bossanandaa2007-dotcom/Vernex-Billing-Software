import { authErrorResponse, requireAuth } from '@/lib/auth';
import { getBusinessSubscriptionStatus } from '@/lib/subscription';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const ctx = await requireAuth(request);
    const subscription = await getBusinessSubscriptionStatus(ctx.businessId);
    return NextResponse.json({ subscription });
  } catch (error) {
    const response = authErrorResponse(error);
    if (response) return response;
    return NextResponse.json({ error: 'Unable to load subscription status.' }, { status: 500 });
  }
}

