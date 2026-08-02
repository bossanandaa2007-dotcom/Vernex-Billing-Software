import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authErrorResponse, requireAuth } from '@/lib/auth';
import { createPrivilegedSupabase } from '@/lib/super-admin/supabase.server';
import { getPlan } from '@/lib/subscription-plans';
import { PaymentsUnavailableError, razorpayClient, razorpayConfig, toMinorUnits } from '@/lib/razorpay';

const schema = z.object({ plan: z.enum(['MONTHLY', 'YEARLY']) });

// Opens a Razorpay order for the selected plan and records it as CREATED. The
// price comes from the server-side plan config, never from the request body, so
// a tampered client cannot buy a year for a rupee.
export async function POST(request: Request) {
  try {
    const ctx = await requireAuth(request);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Choose a valid plan.' }, { status: 400 });
    const plan = getPlan(parsed.data.plan);
    if (!plan) return NextResponse.json({ error: 'Choose a valid plan.' }, { status: 400 });

    const config = razorpayConfig();
    if (!config) throw new PaymentsUnavailableError();

    const order = await razorpayClient().orders.create({
      amount: toMinorUnits(plan.price),
      currency: plan.currency,
      // Razorpay caps receipt at 40 characters.
      receipt: `sub_${ctx.businessId}`.slice(0, 40),
      notes: { businessId: ctx.businessId, plan: plan.key },
    });

    const supabase = createPrivilegedSupabase();
    const { data: business } = await supabase.from('Business').select('name').eq('id', ctx.businessId).maybeSingle();
    const { error } = await supabase.from('subscription_payments').insert({
      businessId: ctx.businessId,
      plan: plan.key,
      planName: plan.name,
      amount: plan.price,
      currency: plan.currency,
      provider: 'RAZORPAY',
      method: 'RAZORPAY',
      orderId: order.id,
      reference: '',
      status: 'CREATED',
      businessNameSnapshot: business?.name ?? '',
      submittedByStaffId: ctx.staffId,
      submittedByName: ctx.name,
      submittedByEmail: ctx.email,
    });
    if (error) throw error;

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: config.keyId,
      planName: plan.name,
      businessName: business?.name ?? '',
      customer: { name: ctx.name, email: ctx.email },
    });
  } catch (error) {
    if (error instanceof PaymentsUnavailableError) {
      return NextResponse.json({ error: error.message, notConfigured: true }, { status: 503 });
    }
    const response = authErrorResponse(error);
    if (response) return response;
    return NextResponse.json({ error: 'Unable to start the payment. Please try again.' }, { status: 500 });
  }
}
