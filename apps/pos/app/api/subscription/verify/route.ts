import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authErrorResponse, requireAuth } from '@/lib/auth';
import { verifyCheckoutSignature } from '@/lib/razorpay';
import { activatePaidOrder, markOrderFailed } from '@/services/subscription/activate.server';
import { createPrivilegedSupabase } from '@/lib/super-admin/supabase.server';

const schema = z.object({
  razorpay_order_id: z.string().trim().min(4).max(120),
  razorpay_payment_id: z.string().trim().min(4).max(120),
  razorpay_signature: z.string().trim().min(16).max(256),
});

// Called by the browser the moment Razorpay Checkout succeeds. The signature is
// the proof of payment; the webhook covers the case where the customer closes
// the tab before this request lands.
export async function POST(request: Request) {
  try {
    const ctx = await requireAuth(request);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Invalid payment confirmation.' }, { status: 400 });
    const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = parsed.data;

    if (!verifyCheckoutSignature(orderId, paymentId, signature)) {
      await markOrderFailed(orderId, 'Signature verification failed.');
      return NextResponse.json({ error: 'We could not verify this payment. Contact Vernex if money was debited.' }, { status: 400 });
    }

    // The signature proves Razorpay issued the payment, not that it belongs to
    // the caller. Confirm the order was opened by this business before it can
    // activate anything.
    const supabase = createPrivilegedSupabase();
    const { data: payment } = await supabase
      .from('subscription_payments')
      .select('businessId')
      .eq('orderId', orderId)
      .maybeSingle();
    if (!payment || payment.businessId !== ctx.businessId) {
      return NextResponse.json({ error: 'This payment does not belong to your business.' }, { status: 403 });
    }

    const result = await activatePaidOrder({ orderId, paymentId });
    if (result.status === 'unknown-order') {
      return NextResponse.json({ error: 'We could not find this payment. Contact Vernex if money was debited.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, activatedUntil: result.activatedUntil });
  } catch (error) {
    const response = authErrorResponse(error);
    if (response) return response;
    return NextResponse.json({ error: 'Unable to confirm your payment. Contact Vernex if money was debited.' }, { status: 500 });
  }
}
