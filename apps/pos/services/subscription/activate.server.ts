import 'server-only';
import { createPrivilegedSupabase } from '@/lib/super-admin/supabase.server';
import { invalidateSubscriptionCache } from '@/lib/subscription';
import { getPlan } from '@/lib/subscription-plans';

// Renewing early stacks onto whatever is left of the current period, so a
// customer never loses days they already paid for.
function periodEnd(current: string | null, durationDays: number, now: Date) {
  const existing = current ? new Date(current) : null;
  const start = existing && existing > now ? existing : now;
  return new Date(start.getTime() + durationDays * 86_400_000);
}

export type ActivationResult =
  | { status: 'activated'; activatedUntil: string }
  | { status: 'already-activated'; activatedUntil: string | null }
  | { status: 'unknown-order' };

/**
 * Turns a paid Razorpay order into an active licence.
 *
 * Both the browser callback and the webhook call this for the same payment, and
 * either may arrive first. The conditional update on status = 'CREATED' is the
 * idempotency guard: whichever request gets there first flips the row and
 * extends the period, the second sees zero rows changed and does nothing. Two
 * callers can never stack the plan duration twice onto one payment.
 *
 * Signature verification is the caller's job — never call this on an unverified
 * payment.
 */
export async function activatePaidOrder({
  orderId,
  paymentId,
}: {
  orderId: string;
  paymentId: string;
}): Promise<ActivationResult> {
  const supabase = createPrivilegedSupabase();
  const now = new Date();

  const { data: payment } = await supabase
    .from('subscription_payments')
    .select('id, businessId, plan, status, activatedUntil')
    .eq('orderId', orderId)
    .maybeSingle();
  if (!payment) return { status: 'unknown-order' };
  if (payment.status === 'APPROVED') {
    return { status: 'already-activated', activatedUntil: payment.activatedUntil };
  }

  const plan = getPlan(payment.plan);
  if (!plan) return { status: 'unknown-order' };

  const { data: business } = await supabase
    .from('Business')
    .select('planExpiresAt')
    .eq('id', payment.businessId)
    .maybeSingle();
  const expiresAt = periodEnd(business?.planExpiresAt ?? null, plan.durationDays, now);

  // Claim the payment first. `.eq('status', 'CREATED')` makes this a
  // compare-and-set: if the webhook already claimed it, `claimed` is empty and
  // we must not extend the licence a second time.
  const { data: claimed, error: claimError } = await supabase
    .from('subscription_payments')
    .update({
      status: 'APPROVED',
      paymentId,
      reference: paymentId,
      reviewedAt: now.toISOString(),
      activatedFrom: now.toISOString(),
      activatedUntil: expiresAt.toISOString(),
    })
    .eq('id', payment.id)
    .eq('status', 'CREATED')
    .select('id');
  if (claimError) throw claimError;
  if (!claimed?.length) {
    const { data: settled } = await supabase
      .from('subscription_payments')
      .select('activatedUntil')
      .eq('id', payment.id)
      .maybeSingle();
    return { status: 'already-activated', activatedUntil: settled?.activatedUntil ?? null };
  }

  const { error: businessError } = await supabase
    .from('Business')
    .update({
      subscriptionStatus: 'ACTIVE',
      planName: plan.name,
      planPeriod: plan.key,
      activatedAt: now.toISOString(),
      planExpiresAt: expiresAt.toISOString(),
      suspendedAt: null,
      updatedAt: now.toISOString(),
    })
    .eq('id', payment.businessId);
  if (businessError) throw businessError;

  // Drop the cached "expired" verdict so the POS unlocks immediately.
  invalidateSubscriptionCache(payment.businessId);

  return { status: 'activated', activatedUntil: expiresAt.toISOString() };
}

export async function markOrderFailed(orderId: string, reason: string) {
  const supabase = createPrivilegedSupabase();
  await supabase
    .from('subscription_payments')
    .update({ status: 'FAILED', failureReason: reason.slice(0, 300) })
    .eq('orderId', orderId)
    .eq('status', 'CREATED');
}
