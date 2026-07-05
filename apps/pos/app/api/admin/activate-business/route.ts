import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerEnvironment } from '@/lib/env.server';
import { timingSafeEqual } from 'node:crypto';

const schema = z.object({
  businessId: z.string().min(1),
  planName: z.string().trim().min(2).max(50).default('Activated Plan'),
});

export async function POST(request: Request) {
  const secret = getServerEnvironment().VERNEX_ADMIN_SECRET;
  const suppliedSecret = request.headers.get('x-vernex-admin-secret') ?? '';
  const expected = Buffer.from(secret);
  const supplied = Buffer.from(suppliedSecret);
  const authorized = supplied.length === expected.length && timingSafeEqual(supplied, expected);
  if (!authorized) {
    return NextResponse.json({ error: 'Admin activation is not authorized.' }, { status: 403 });
  }
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Enter a valid business and plan name.' }, { status: 400 });
  try {
    const existing = await db.business.findUnique({
      where: { id: parsed.data.businessId },
      select: { id: true, subscriptionStatus: true, planName: true, activatedAt: true },
    });
    if (!existing) return NextResponse.json({ error: 'Business account not found.' }, { status: 404 });
    if (existing.subscriptionStatus === 'ACTIVE') {
      return NextResponse.json({ activation: existing, alreadyActive: true });
    }
    const activation = await db.business.update({
      where: { id: parsed.data.businessId },
      data: {
        subscriptionStatus: 'ACTIVE',
        planName: parsed.data.planName,
        activatedAt: new Date(),
        suspendedAt: null,
      },
      select: { id: true, subscriptionStatus: true, planName: true, activatedAt: true },
    });
    return NextResponse.json({ activation, alreadyActive: false });
  } catch {
    return NextResponse.json({ error: 'Unable to activate this business. Please try again.' }, { status: 500 });
  }
}
