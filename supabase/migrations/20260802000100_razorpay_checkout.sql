-- Subscriptions move from offline payment + manual admin approval to Razorpay
-- Checkout. A payment now activates the licence automatically once its
-- signature is verified, so no human is in the money path.
--
-- The subscription_payments table is reused as the payment ledger; these columns
-- record the gateway side of each transaction.

ALTER TABLE public.subscription_payments
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'RAZORPAY',
  ADD COLUMN IF NOT EXISTS "orderId" text,
  ADD COLUMN IF NOT EXISTS "paymentId" text,
  ADD COLUMN IF NOT EXISTS "failureReason" text NOT NULL DEFAULT '';

-- Rows now start life as CREATED (order opened, customer has not paid yet) and
-- become APPROVED on verification or FAILED if the gateway rejects it.
ALTER TABLE public.subscription_payments ALTER COLUMN status SET DEFAULT 'CREATED';

-- `reference` held the customer-typed UPI reference under the manual flow. The
-- gateway supplies its own ids, so it is no longer required.
ALTER TABLE public.subscription_payments ALTER COLUMN reference SET DEFAULT '';

-- One pending payment per business made sense when a human reviewed each one.
-- With a gateway a customer may abandon checkout and immediately retry, which
-- must not be blocked.
DROP INDEX IF EXISTS public.subscription_payments_one_pending_idx;

-- The order id is the idempotency key: the browser callback and the webhook can
-- both report the same payment, and only one of them may activate the licence.
CREATE UNIQUE INDEX IF NOT EXISTS subscription_payments_order_idx
  ON public.subscription_payments ("orderId")
  WHERE "orderId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS subscription_payments_payment_idx
  ON public.subscription_payments ("paymentId");

-- Tenants may still read their own receipts and open a checkout, but the
-- INSERT policy no longer needs to force 'PENDING' — order creation is done by
-- the server route, and only the service-role client marks anything APPROVED.
DROP POLICY IF EXISTS subscription_payments_tenant_insert ON public.subscription_payments;
CREATE POLICY subscription_payments_tenant_insert ON public.subscription_payments
FOR INSERT TO authenticated
WITH CHECK ("businessId" = public.current_vernex_business_id() AND status = 'CREATED');
