CREATE TABLE IF NOT EXISTS public.business_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id text NOT NULL REFERENCES public."Business"("id") ON DELETE CASCADE,
  module_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT business_modules_business_module_unique UNIQUE (business_id, module_key)
);

ALTER TABLE public."StaffProfile" ADD COLUMN IF NOT EXISTS "userId" text;
CREATE UNIQUE INDEX IF NOT EXISTS staff_profile_user_id_unique
  ON public."StaffProfile" (lower("userId"))
  WHERE "userId" IS NOT NULL;

ALTER TABLE public.business_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS business_modules_tenant_read ON public.business_modules;
CREATE POLICY business_modules_tenant_read
ON public.business_modules
FOR SELECT TO authenticated
USING (business_id = public.current_vernex_business_id());

CREATE OR REPLACE FUNCTION public.set_business_modules_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS business_modules_updated_at ON public.business_modules;
CREATE TRIGGER business_modules_updated_at
BEFORE UPDATE ON public.business_modules
FOR EACH ROW EXECUTE FUNCTION public.set_business_modules_updated_at();

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
    'sales_records', 'business_settings'
  )
  FROM unnest(ARRAY[
    'core', 'dashboard', 'pos_billing', 'products', 'customers', 'sales_records',
    'inventory', 'inventory_ledger', 'stock_adjustment', 'purchase_entry', 'suppliers',
    'finance', 'reports', 'gst_reports', 'tax_settings', 'expense_tracking',
    'staff', 'staff_management', 'attendance', 'roles_permissions',
    'business', 'business_settings', 'printer_settings', 'receipt_customization',
    'advanced', 'audit_logs', 'analytics', 'multi_counter', 'multiple_branches',
    'barcode_support', 'kitchen_display', 'customer_loyalty', 'credit_sales',
    'returns_refunds', 'offline_mode'
  ]) AS key
  ON CONFLICT (business_id, module_key) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS business_default_modules ON public."Business";
CREATE TRIGGER business_default_modules
AFTER INSERT ON public."Business"
FOR EACH ROW EXECUTE FUNCTION public.create_default_business_modules();

INSERT INTO public.business_modules (business_id, module_key, enabled)
SELECT business."id", key, key IN (
  'dashboard', 'pos_billing', 'products', 'customers',
  'sales_records', 'business_settings'
)
FROM public."Business" business
CROSS JOIN unnest(ARRAY[
  'core', 'dashboard', 'pos_billing', 'products', 'customers', 'sales_records',
  'inventory', 'inventory_ledger', 'stock_adjustment', 'purchase_entry', 'suppliers',
  'finance', 'reports', 'gst_reports', 'tax_settings', 'expense_tracking',
  'staff', 'staff_management', 'attendance', 'roles_permissions',
  'business', 'business_settings', 'printer_settings', 'receipt_customization',
  'advanced', 'audit_logs', 'analytics', 'multi_counter', 'multiple_branches',
  'barcode_support', 'kitchen_display', 'customer_loyalty', 'credit_sales',
  'returns_refunds', 'offline_mode'
]) AS key
ON CONFLICT (business_id, module_key) DO NOTHING;

GRANT SELECT ON public.business_modules TO authenticated;
