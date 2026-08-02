import { NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/razorpay';
import { activatePaidOrder, markOrderFailed } from '@/services/subscription/activate.server';

// Razorpay -> Vernex. This is the safety net: if the customer's browser dies
// between paying and calling /api/subscription/verify, the licence still
// activates. Unauthenticated by necessity — the HMAC signature is the auth.
//
// Node runtime, because the signature is computed over the exact raw body.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RazorpayEvent = {
  event?: string;
  payload?: {
    payment?: {
      entity?: { id?: string; order_id?: string; error_description?: string; error_reason?: string };
    };
  };
};

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-razorpay-signature') ?? '';

  if (!verifyWebhookSignature(rawBody, signature)) {
    // Also covers "webhook secret not configured" — refuse rather than trust.
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 });
  }

  let event: RazorpayEvent;
  try {
    event = JSON.parse(rawBody) as RazorpayEvent;
  } catch {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 });
  }

  const entity = event.payload?.payment?.entity;
  const orderId = entity?.order_id;
  const paymentId = entity?.id;

  try {
    if ((event.event === 'payment.captured' || event.event === 'order.paid') && orderId && paymentId) {
      // Idempotent: if the browser callback already activated this order, this
      // is a no-op and the licence period is not extended twice.
      await activatePaidOrder({ orderId, paymentId });
    } else if (event.event === 'payment.failed' && orderId) {
      await markOrderFailed(orderId, entity?.error_description || entity?.error_reason || 'Payment failed.');
    }
  } catch {
    // A 5xx makes Razorpay retry, which is what we want for a transient
    // database error — the activation call is safe to repeat.
    return NextResponse.json({ error: 'Unable to process this event.' }, { status: 500 });
  }

  // Always acknowledge handled and ignored events, so Razorpay stops retrying.
  return NextResponse.json({ received: true });
}
