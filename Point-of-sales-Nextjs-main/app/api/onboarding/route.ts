import { authErrorResponse, requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { TaxMode } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const schema = z.object({
  businessName: z.string().trim().min(2),
  ownerName: z.string().trim().min(2),
  phone: z.string().trim().max(30).optional(),
  country: z.string().trim().min(2).default('India'),
  currency: z.enum(['INR', 'USD', 'EUR', 'GBP', 'AED']).default('INR'),
  taxMode: z.nativeEnum(TaxMode).default(TaxMode.GST),
});

export async function POST(request: Request) {
  try {
    const ctx = await requireAuth(request);
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    const trialStartedAt = new Date();
    const trialEndsAt = new Date(trialStartedAt);
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    const result = await db.$transaction(async (tx) => {
      const business = await tx.business.create({
        data: {
          name: parsed.data.businessName,
          country: parsed.data.country,
          currency: parsed.data.currency,
          taxMode: parsed.data.taxMode,
          ownerUserId: ctx.authUserId,
          trialStartedAt,
          trialEndsAt,
          subscriptionStatus: 'TRIAL',
          planName: 'Free Trial',
        },
      });
      const owner = await tx.staffProfile.create({
        data: {
          authUserId: `${ctx.authUserId}-${business.id}`,
          businessId: business.id,
          name: parsed.data.ownerName,
          email: ctx.email,
          phone: parsed.data.phone || null,
          role: 'OWNER',
          status: 'ACTIVE',
        },
      });
      const shopData = await tx.shopData.create({
        data: {
          businessId: business.id,
          name: parsed.data.businessName,
          country: parsed.data.country,
          currency: parsed.data.currency,
          taxMode: parsed.data.taxMode,
          phone: parsed.data.phone || null,
        },
      });
      await tx.billSequence.upsert({
        where: { id: business.id },
        create: { id: business.id, businessId: business.id, nextNumber: 1 },
        update: { businessId: business.id },
      });
      return { business, owner, shopData };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const response = authErrorResponse(error);
    if (response) return response;
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to complete onboarding.' }, { status: 400 });
  }
}

