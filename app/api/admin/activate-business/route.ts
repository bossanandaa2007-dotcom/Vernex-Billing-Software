import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const schema = z.object({
  businessId: z.string().min(1),
  planName: z.string().trim().min(2).max(50).default('Activated Plan'),
});

export async function POST(request: Request) {
  const secret = process.env.VERNEX_ADMIN_SECRET;
  if (!secret || request.headers.get('x-vernex-admin-secret') !== secret) {
    return NextResponse.json({ error: 'Admin activation is not authorized.' }, { status: 403 });
  }
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const business = await db.business.update({
    where: { id: parsed.data.businessId },
    data: {
      subscriptionStatus: 'ACTIVE',
      planName: parsed.data.planName,
      activatedAt: new Date(),
      suspendedAt: null,
    },
  });
  return NextResponse.json({ business });
}

