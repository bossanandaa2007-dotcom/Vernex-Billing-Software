-- Paid subscriptions: when a trial ends the business must buy a MONTHLY or
-- YEARLY plan before the POS unlocks again. Payment is collected offline (UPI /
-- bank transfer); the business submits the reference here and the Super Admin
-- approves it, which activates the licence.
--
-- Plan validity lives in its own column rather than reusing "trialEndsAt", so
-- existing ACTIVE businesses (which have no paid period recorded) keep working
-- unchanged — a NULL "planExpiresAt" means "never expires".

-- ---------------------------------------------------------------------------
-- Business: paid plan period
-- ---------------------------------------------------------------------------
ALTER TABLE public."Business"
  ADD COLUMN IF NOT EXISTS "planExpiresAt" timestamptz,
  ADD COLUMN IF NOT EXISTS "planPeriod" text;   -- MONTHLY | YEARLY | NULL

-- ---------------------------------------------------------------------------
-- Payment requests
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscription_payments (
  id text PRIMARY KEY DEFAULT public.vernex_id(),
  "businessId" text NOT NULL REFERENCES public."Business"("id") ON DELETE CASCADE,
  plan text NOT NULL,                              -- MONTHLY | YEARLY
  "planName" text NOT NULL DEFAULT '',
  amount numeric(12, 2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  method text NOT NULL DEFAULT 'UPI',              -- UPI | BANK_TRANSFER | CASH | OTHER
  reference text NOT NULL,                         -- UPI ref / bank txn id
  "payerName" text NOT NULL DEFAULT '',
  note text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'PENDING',          -- PENDING | APPROVED | REJECTED
  "reviewNote" text NOT NULL DEFAULT '',
  "reviewedAt" timestamptz,
  "activatedFrom" timestamptz,
  "activatedUntil" timestamptz,
  "businessNameSnapshot" text NOT NULL DEFAULT '',
  "submittedByStaffId" text,
  "submittedByName" text NOT NULL DEFAULT '',
  "submittedByEmail" text NOT NULL DEFAULT '',
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS subscription_payments_business_idx ON public.subscription_payments ("businessId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS subscription_payments_status_idx ON public.subscription_payments (status, "createdAt" DESC);

-- At most one payment awaiting review per business, so a business cannot flood
-- the admin queue with duplicates while the first request is still open.
CREATE UNIQUE INDEX IF NOT EXISTS subscription_payments_one_pending_idx
  ON public.subscription_payments ("businessId")
  WHERE status = 'PENDING';

-- ---------------------------------------------------------------------------
-- Row Level Security
-- A business reads and submits only its own payment requests. Approval is done
-- by the Super Admin portal through the service-role client, which bypasses RLS
-- — tenants must never be able to mark their own payment APPROVED.
-- ---------------------------------------------------------------------------
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS subscription_payments_tenant_read ON public.subscription_payments;
CREATE POLICY subscription_payments_tenant_read ON public.subscription_payments
FOR SELECT TO authenticated
USING ("businessId" = public.current_vernex_business_id());

DROP POLICY IF EXISTS subscription_payments_tenant_insert ON public.subscription_payments;
CREATE POLICY subscription_payments_tenant_insert ON public.subscription_payments
FOR INSERT TO authenticated
WITH CHECK ("businessId" = public.current_vernex_business_id() AND status = 'PENDING');

GRANT SELECT, INSERT ON public.subscription_payments TO authenticated;

CREATE OR REPLACE FUNCTION public.set_subscription_payment_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS subscription_payments_updated_at ON public.subscription_payments;
CREATE TRIGGER subscription_payments_updated_at
BEFORE UPDATE ON public.subscription_payments
FOR EACH ROW EXECUTE FUNCTION public.set_subscription_payment_updated_at();
