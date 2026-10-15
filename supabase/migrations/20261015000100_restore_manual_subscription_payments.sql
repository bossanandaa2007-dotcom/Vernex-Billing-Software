-- The Razorpay checkout (20260802000100_razorpay_checkout, branch
-- razorpay-implementation) was reverted in code, but its migration had already
-- been applied. The app is back on offline payment + Super Admin approval, which
-- inserts requests as 'PENDING', so the 'CREATED'-only insert policy rejected
-- every submission with an RLS violation.
--
-- This restores the manual-flow rules from 20260801000100_subscription_payments.
-- The gateway columns (provider, orderId, paymentId, failureReason) and their
-- indexes are left in place; they are nullable or defaulted and unused by the
-- manual flow.

ALTER TABLE public.subscription_payments ALTER COLUMN status SET DEFAULT 'PENDING';

-- At most one payment awaiting review per business.
CREATE UNIQUE INDEX IF NOT EXISTS subscription_payments_one_pending_idx
  ON public.subscription_payments ("businessId")
  WHERE status = 'PENDING';

DROP POLICY IF EXISTS subscription_payments_tenant_insert ON public.subscription_payments;
CREATE POLICY subscription_payments_tenant_insert ON public.subscription_payments
FOR INSERT TO authenticated
WITH CHECK ("businessId" = public.current_vernex_business_id() AND status = 'PENDING');
