import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authErrorResponse, requireAuth } from '@/lib/auth';
import { createServerClient } from '@/src/lib/supabase/server';
import { getPlan } from '@/lib/subscription-plans';

const submitSchema = z.object({
  plan: z.enum(['MONTHLY', 'YEARLY']),
  method: z.enum(['UPI', 'CASH']),
  payerName: z.string().trim().max(120).optional(),
  note: z.string().trim().max(500).optional(),
});

export async function GET(request: Request) {
  try {
    const ctx = await requireAuth(request);
    const supabase = await createServerClient(request);
    const { data, error } = await supabase
      .from('subscription_payments')
      .select('id, plan, planName, amount, currency, method, payerName, note, status, reviewNote, activatedUntil, createdAt, reviewedAt')
      .eq('businessId', ctx.businessId)
      .order('createdAt', { ascending: false })
      .limit(20);
    if (error) throw error;
    const response = NextResponse.json({ payments: data ?? [] });
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch (error) {
    const response = authErrorResponse(error);
    if (response) return response;
    return NextResponse.json({ error: 'Unable to load your payment history.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireAuth(request);
    const parsed = submitSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Enter valid payment details.' }, { status: 400 });
    }
    const plan = getPlan(parsed.data.plan);
    if (!plan) return NextResponse.json({ error: 'Choose a valid plan.' }, { status: 400 });

    const supabase = await createServerClient(request);
    const { data: business } = await supabase
      .from('Business')
      .select('name')
      .eq('id', ctx.businessId)
      .maybeSingle();

    const { error } = await supabase.from('subscription_payments').insert({
      businessId: ctx.businessId,
      plan: plan.key,
      planName: plan.name,
      amount: plan.price,
      currency: plan.currency,
      method: parsed.data.method,
      reference: `${plan.key}-${Date.now()}`,
      payerName: parsed.data.payerName || ctx.name,
      note: parsed.data.note || '',
      status: 'PENDING',
      businessNameSnapshot: String(business?.name ?? ''),
      submittedByStaffId: ctx.staffId,
      submittedByName: ctx.name,
      submittedByEmail: ctx.email,
    });
    if (error) {
      const duplicate = error.message?.includes('subscription_payments_one_pending_idx') || error.message?.includes('duplicate');
      return NextResponse.json({
        error: duplicate
          ? 'You already have a payment waiting for Vernex confirmation.'
          : `Unable to submit payment details.${process.env.NODE_ENV === 'development' ? ` ${error.message}` : ''}`,
      }, { status: duplicate ? 409 : 500 });
    }
    const response = NextResponse.json({ success: true });
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch (error) {
    const response = authErrorResponse(error);
    if (response) return response;
    return NextResponse.json({ error: 'Unable to submit payment details.' }, { status: 500 });
  }
}
