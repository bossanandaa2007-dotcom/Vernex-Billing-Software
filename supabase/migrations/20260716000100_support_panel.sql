-- Support Panel: POS users raise tickets to contact the platform admin; the
-- Super Admin portal reads every ticket and replies. A ticket holds a threaded
-- conversation (support_messages) between the business staff and the admin.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id text PRIMARY KEY DEFAULT public.vernex_id(),
  "businessId" text NOT NULL REFERENCES public."Business"("id") ON DELETE CASCADE,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'OPEN',       -- OPEN | PENDING | RESOLVED | CLOSED
  priority text NOT NULL DEFAULT 'NORMAL',   -- LOW | NORMAL | HIGH
  "createdByStaffId" text,
  "createdByName" text NOT NULL DEFAULT '',
  "createdByEmail" text NOT NULL DEFAULT '',
  "businessNameSnapshot" text NOT NULL DEFAULT '',
  "lastMessageAt" timestamptz NOT NULL DEFAULT now(),
  "lastMessageFrom" text NOT NULL DEFAULT 'USER',  -- USER | ADMIN
  "unreadForAdmin" boolean NOT NULL DEFAULT true,
  "unreadForUser" boolean NOT NULL DEFAULT false,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.support_messages (
  id text PRIMARY KEY DEFAULT public.vernex_id(),
  "ticketId" text NOT NULL REFERENCES public.support_tickets("id") ON DELETE CASCADE,
  "businessId" text NOT NULL REFERENCES public."Business"("id") ON DELETE CASCADE,
  "senderType" text NOT NULL,   -- USER | ADMIN
  "senderName" text NOT NULL DEFAULT '',
  body text NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_tickets_business_idx ON public.support_tickets ("businessId");
CREATE INDEX IF NOT EXISTS support_tickets_status_idx ON public.support_tickets (status);
CREATE INDEX IF NOT EXISTS support_tickets_last_message_idx ON public.support_tickets ("lastMessageAt" DESC);
CREATE INDEX IF NOT EXISTS support_messages_ticket_idx ON public.support_messages ("ticketId", "createdAt");

-- ---------------------------------------------------------------------------
-- Row Level Security
-- POS staff (authenticated) may read/write only their own business's records.
-- The Super Admin portal uses the service-role client, which bypasses RLS.
-- ---------------------------------------------------------------------------
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS support_tickets_tenant ON public.support_tickets;
CREATE POLICY support_tickets_tenant ON public.support_tickets
FOR ALL TO authenticated
USING ("businessId" = public.current_vernex_business_id())
WITH CHECK ("businessId" = public.current_vernex_business_id());

DROP POLICY IF EXISTS support_messages_tenant ON public.support_messages;
CREATE POLICY support_messages_tenant ON public.support_messages
FOR ALL TO authenticated
USING ("businessId" = public.current_vernex_business_id())
WITH CHECK ("businessId" = public.current_vernex_business_id());

GRANT SELECT, INSERT, UPDATE ON public.support_tickets TO authenticated;
GRANT SELECT, INSERT ON public.support_messages TO authenticated;

-- Keep updatedAt fresh on ticket changes.
CREATE OR REPLACE FUNCTION public.set_support_ticket_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS support_tickets_updated_at ON public.support_tickets;
CREATE TRIGGER support_tickets_updated_at
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.set_support_ticket_updated_at();

-- ---------------------------------------------------------------------------
-- Register the 'support' module so it appears in the module system, enabled by
-- default for every business (support should always be reachable).
-- ---------------------------------------------------------------------------
INSERT INTO public.business_modules (business_id, module_key, enabled)
SELECT business."id", 'support', true
FROM public."Business" business
ON CONFLICT (business_id, module_key) DO UPDATE SET enabled = true;

-- New businesses get the full module set from create_default_business_modules();
-- extend it so 'support' is provisioned (and enabled) for them too.
CREATE OR REPLACE FUNCTION public.create_default_business_modules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.business_modules (business_id, module_key, enabled)
  SELECT NEW."id", key, key IN (
    'dashboard', 'pos_billing', 'products', 'customers',
    'sales_records', 'business_settings', 'support'
  )
  FROM unnest(ARRAY[
    'core', 'dashboard', 'pos_billing', 'products', 'customers', 'sales_records',
    'inventory', 'inventory_ledger', 'stock_adjustment', 'purchase_entry', 'suppliers',
    'finance', 'reports', 'gst_reports', 'tax_settings', 'expense_tracking',
    'staff', 'staff_management', 'attendance', 'roles_permissions',
    'business', 'business_settings', 'printer_settings', 'receipt_customization',
    'advanced', 'audit_logs', 'analytics', 'multi_counter', 'multiple_branches',
    'barcode_support', 'kitchen_display', 'customer_loyalty', 'credit_sales',
    'returns_refunds', 'offline_mode', 'support'
  ]) AS key
  ON CONFLICT (business_id, module_key) DO NOTHING;
  RETURN NEW;
END;
$$;
