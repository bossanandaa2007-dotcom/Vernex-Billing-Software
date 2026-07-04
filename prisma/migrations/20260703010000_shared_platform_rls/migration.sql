CREATE OR REPLACE FUNCTION public.current_vernex_business_id()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT "businessId"
  FROM "StaffProfile"
  WHERE "authUserId" = auth.uid()::text
    AND "status" = 'ACTIVE'
  ORDER BY "createdAt" ASC
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.current_vernex_business_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_vernex_business_id() TO authenticated;

UPDATE auth.users
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) - 'vernex_super_admin';

UPDATE auth.users
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"vernex_super_admin": true}'::jsonb
WHERE lower(email) = 'sivasanthosh1776@gmail.com';

DO $$
DECLARE
  table_name TEXT;
  tenant_tables TEXT[] := ARRAY[
    'ProductStock', 'Transaction', 'Customer', 'InventoryMovement',
    'SaleReturn', 'ShopData', 'BillSequence', 'StaffProfile', 'AuditLog'
  ];
  platform_tables TEXT[] := ARRAY[
    'Business', 'ProductStock', 'Product', 'OnSaleProduct', 'Transaction',
    'Customer', 'InventoryMovement', 'SaleReturn', 'ReturnItem', 'ShopData',
    'BillSequence', 'StaffProfile', 'AuditLog'
  ];
BEGIN
  FOREACH table_name IN ARRAY platform_tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS vernex_super_admin_all ON public.%I', table_name);
    EXECUTE format(
      'CREATE POLICY vernex_super_admin_all ON public.%I FOR ALL TO authenticated USING ((auth.jwt()->''app_metadata''->>''vernex_super_admin'')::boolean IS TRUE) WITH CHECK ((auth.jwt()->''app_metadata''->>''vernex_super_admin'')::boolean IS TRUE)',
      table_name
    );
  END LOOP;

  FOREACH table_name IN ARRAY tenant_tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS vernex_tenant_read ON public.%I', table_name);
    EXECUTE format(
      'CREATE POLICY vernex_tenant_read ON public.%I FOR SELECT TO authenticated USING ("businessId" = public.current_vernex_business_id())',
      table_name
    );
  END LOOP;
END $$;

DROP POLICY IF EXISTS vernex_tenant_business_read ON public."Business";
CREATE POLICY vernex_tenant_business_read
ON public."Business"
FOR SELECT
TO authenticated
USING ("id" = public.current_vernex_business_id());

DROP POLICY IF EXISTS vernex_tenant_product_read ON public."Product";
CREATE POLICY vernex_tenant_product_read
ON public."Product"
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public."ProductStock" stock
    WHERE stock."id" = "Product"."productId"
      AND stock."businessId" = public.current_vernex_business_id()
  )
);

DROP POLICY IF EXISTS vernex_tenant_sale_line_read ON public."OnSaleProduct";
CREATE POLICY vernex_tenant_sale_line_read
ON public."OnSaleProduct"
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public."Transaction" sale
    WHERE sale."id" = "OnSaleProduct"."transactionId"
      AND sale."businessId" = public.current_vernex_business_id()
  )
);

DROP POLICY IF EXISTS vernex_tenant_return_item_read ON public."ReturnItem";
CREATE POLICY vernex_tenant_return_item_read
ON public."ReturnItem"
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public."SaleReturn" returned
    WHERE returned."id" = "ReturnItem"."saleReturnId"
      AND returned."businessId" = public.current_vernex_business_id()
  )
);
