import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

const ownerPlaceholderIds = [
  'vernex-owner-auth-user',
  'demo-owner-auth-user',
  'phase6-owner',
];

export async function GET() {
  try {
    const placeholderBusiness = await db.business.findFirst({
      where: { ownerUserId: { in: ownerPlaceholderIds } },
      select: { id: true },
    });
    const response = NextResponse.json({ available: Boolean(placeholderBusiness) });
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch {
    return NextResponse.json({ available: false });
  }
}
