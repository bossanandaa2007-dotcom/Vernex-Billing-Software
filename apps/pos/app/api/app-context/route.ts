import { authErrorResponse, requireAuth } from '@/lib/auth';
import { getBusinessShopData } from '@/lib/shop-data';
import { getBusinessSubscriptionStatus } from '@/lib/subscription';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    const [subscription, shop] = await Promise.all([
      getBusinessSubscriptionStatus(user.businessId),
      getBusinessShopData(user.businessId, request),
    ]);
    const response = NextResponse.json({ user, subscription, shop: shop.data });
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch (error) {
    const response = authErrorResponse(error);
    if (response) return response;
    return NextResponse.json({ error: 'Unable to load app context.' }, { status: 500 });
  }
}
