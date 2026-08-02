import { NextResponse } from 'next/server';
import { authErrorResponse, requireAuth } from '@/lib/auth';
import { createServerClient } from '@/src/lib/supabase/server';

// Receipt history for the signed-in business. Payments are created by
// /api/subscription/checkout and settled by the gateway — there is no manual
// submission path, so this endpoint is read-only.
export async function GET(request: Request) {
  try {
    const ctx = await requireAuth(request);
    const supabase = await createServerClient(request);
    const { data, error } = await supabase
      .from('subscription_payments')
      .select('id, plan, planName, amount, currency, method, reference, paymentId, status, failureReason, activatedUntil, createdAt, reviewedAt')
      .eq('businessId', ctx.businessId)
      // A CREATED row is an abandoned checkout, not a receipt — hide it.
      .neq('status', 'CREATED')
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
