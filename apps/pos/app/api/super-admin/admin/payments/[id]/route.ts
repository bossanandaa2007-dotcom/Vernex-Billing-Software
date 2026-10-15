import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSuperAdmin } from '@/lib/super-admin/auth.server';
import { createPrivilegedSupabase } from '@/lib/super-admin/supabase.server';
import { writeSuperAdminAudit } from '@/services/super-admin/admin-audit.server';
import { getPlan } from '@/lib/subscription-plans';

const reviewSchema = z.object({
  action: z.enum(['approve', 'reject']),
  reviewNote: z.string().trim().max(500).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  try {
    const parsed = reviewSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Invalid review action.' }, { status: 400 });
    const { id } = await params;
    const supabase = createPrivilegedSupabase();
    const { data: payment, error: paymentError } = await supabase
      .from('subscription_payments')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (paymentError) throw paymentError;
    if (!payment) return NextResponse.json({ error: 'Payment request not found.' }, { status: 404 });
    if (payment.status !== 'PENDING') return NextResponse.json({ error: 'This payment has already been reviewed.' }, { status: 409 });

    if (parsed.data.action === 'reject') {
      const { error } = await supabase
        .from('subscription_payments')
        .update({ status: 'REJECTED', reviewNote: parsed.data.reviewNote || 'Rejected by Vernex.', reviewedAt: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      await writeSuperAdminAudit({
        businessId: payment.businessId,
        action: 'PAYMENT_REJECTED',
        entityType: 'subscription_payments',
        entityId: id,
        description: `Rejected ${payment.planName || payment.plan} payment reference ${payment.reference}.`,
      });
      return NextResponse.json({ success: true });
    }

    const plan = getPlan(payment.plan);
    if (!plan) return NextResponse.json({ error: 'Unknown plan on payment request.' }, { status: 400 });
    const { data: business, error: businessError } = await supabase
      .from('Business')
      .select('planExpiresAt')
      .eq('id', payment.businessId)
      .maybeSingle();
    if (businessError) throw businessError;
    const now = new Date();
    const currentExpiry = business?.planExpiresAt ? new Date(business.planExpiresAt) : null;
    const startsFrom = currentExpiry && currentExpiry > now ? currentExpiry : now;
    const activatedUntil = new Date(startsFrom.getTime() + plan.durationDays * 86_400_000);

    const { error: businessUpdateError } = await supabase
      .from('Business')
      .update({
        subscriptionStatus: 'ACTIVE',
        planName: plan.name,
        planPeriod: plan.key,
        planExpiresAt: activatedUntil.toISOString(),
        activatedAt: now.toISOString(),
        suspendedAt: null,
      })
      .eq('id', payment.businessId);
    if (businessUpdateError) throw businessUpdateError;

    const { error: paymentUpdateError } = await supabase
      .from('subscription_payments')
      .update({
        status: 'APPROVED',
        reviewNote: parsed.data.reviewNote || '',
        reviewedAt: now.toISOString(),
        activatedFrom: startsFrom.toISOString(),
        activatedUntil: activatedUntil.toISOString(),
      })
      .eq('id', id);
    if (paymentUpdateError) throw paymentUpdateError;

    await writeSuperAdminAudit({
      businessId: payment.businessId,
      action: 'PAYMENT_APPROVED',
      entityType: 'subscription_payments',
      entityId: id,
      description: `Approved ${plan.name} payment and activated access until ${activatedUntil.toISOString().slice(0, 10)}.`,
    });
    return NextResponse.json({ success: true, activatedUntil: activatedUntil.toISOString() });
  } catch (error) {
    const message = error instanceof Error && error.message.includes('not configured')
      ? 'Connect the server-only Supabase service-role key to review payments.'
      : 'Unable to review this payment.';
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
