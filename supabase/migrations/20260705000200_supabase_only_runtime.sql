CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.vernex_id()
RETURNS text
LANGUAGE sql
VOLATILE
SET search_path = public
AS $$ SELECT replace(gen_random_uuid()::text, '-', '') $$;

ALTER TABLE public."Business" ALTER COLUMN "id" SET DEFAULT public.vernex_id();
ALTER TABLE public."StaffProfile" ALTER COLUMN "id" SET DEFAULT public.vernex_id();
ALTER TABLE public."Product" ALTER COLUMN "id" SET DEFAULT public.vernex_id();
ALTER TABLE public."Transaction" ALTER COLUMN "id" SET DEFAULT public.vernex_id();
ALTER TABLE public."OnSaleProduct" ALTER COLUMN "id" SET DEFAULT public.vernex_id();
ALTER TABLE public."Customer" ALTER COLUMN "id" SET DEFAULT public.vernex_id();
ALTER TABLE public."InventoryMovement" ALTER COLUMN "id" SET DEFAULT public.vernex_id();
ALTER TABLE public."SaleReturn" ALTER COLUMN "id" SET DEFAULT public.vernex_id();
ALTER TABLE public."ReturnItem" ALTER COLUMN "id" SET DEFAULT public.vernex_id();
ALTER TABLE public."ShopData" ALTER COLUMN "id" SET DEFAULT public.vernex_id();
ALTER TABLE public."AuditLog" ALTER COLUMN "id" SET DEFAULT public.vernex_id();

CREATE OR REPLACE FUNCTION public.current_vernex_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT "role"::text
  FROM public."StaffProfile"
  WHERE "authUserId" = auth.uid()::text AND "status" = 'ACTIVE'
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.current_vernex_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_vernex_role() TO authenticated;

DO $$
DECLARE
  table_name text;
  tenant_tables text[] := ARRAY[
    'ProductStock', 'Transaction', 'Customer', 'InventoryMovement',
    'SaleReturn', 'ShopData', 'BillSequence', 'StaffProfile', 'AuditLog'
  ];
BEGIN
  FOREACH table_name IN ARRAY tenant_tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS vernex_tenant_write ON public.%I', table_name);
    EXECUTE format(
      'CREATE POLICY vernex_tenant_write ON public.%I FOR ALL TO authenticated
       USING ("businessId" = public.current_vernex_business_id())
       WITH CHECK ("businessId" = public.current_vernex_business_id())',
      table_name
    );
  END LOOP;
END $$;

DROP POLICY IF EXISTS vernex_product_write ON public."Product";
CREATE POLICY vernex_product_write ON public."Product"
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public."ProductStock" stock
    WHERE stock."id" = "Product"."productId"
      AND stock."businessId" = public.current_vernex_business_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public."ProductStock" stock
    WHERE stock."id" = "Product"."productId"
      AND stock."businessId" = public.current_vernex_business_id()
  )
);

DROP POLICY IF EXISTS vernex_sale_line_write ON public."OnSaleProduct";
CREATE POLICY vernex_sale_line_write ON public."OnSaleProduct"
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public."Transaction" sale
    WHERE sale."id" = "OnSaleProduct"."transactionId"
      AND sale."businessId" = public.current_vernex_business_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public."Transaction" sale
    WHERE sale."id" = "OnSaleProduct"."transactionId"
      AND sale."businessId" = public.current_vernex_business_id()
  )
);

DROP POLICY IF EXISTS vernex_return_item_write ON public."ReturnItem";
CREATE POLICY vernex_return_item_write ON public."ReturnItem"
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public."SaleReturn" returned
    WHERE returned."id" = "ReturnItem"."saleReturnId"
      AND returned."businessId" = public.current_vernex_business_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public."SaleReturn" returned
    WHERE returned."id" = "ReturnItem"."saleReturnId"
      AND returned."businessId" = public.current_vernex_business_id()
  )
);

CREATE OR REPLACE FUNCTION public.generate_bill_number(p_business_id text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  business_id text := COALESCE(p_business_id, public.current_vernex_business_id());
  next_value integer;
  prefix text := 'VNX';
  padding integer := 6;
  candidate text;
BEGIN
  IF auth.uid() IS NULL OR business_id IS DISTINCT FROM public.current_vernex_business_id() THEN
    RAISE EXCEPTION 'You do not have permission for this action.';
  END IF;

  INSERT INTO public."BillSequence" ("id", "businessId", "nextNumber")
  VALUES (business_id, business_id, 2)
  ON CONFLICT ("id") DO UPDATE
  SET "nextNumber" = public."BillSequence"."nextNumber" + 1
  RETURNING "nextNumber" - 1 INTO next_value;

  SELECT COALESCE("billPrefix", 'VNX'), COALESCE("billPadding", 6)
  INTO prefix, padding
  FROM public."ShopData"
  WHERE "businessId" = business_id
  LIMIT 1;

  candidate := prefix || '-' || lpad(next_value::text, padding, '0');
  WHILE EXISTS (SELECT 1 FROM public."Transaction" WHERE "billNumber" = candidate) LOOP
    UPDATE public."BillSequence"
    SET "nextNumber" = "nextNumber" + 1
    WHERE "id" = business_id
    RETURNING "nextNumber" - 1 INTO next_value;
    candidate := prefix || '-' || lpad(next_value::text, padding, '0');
  END LOOP;
  RETURN candidate;
END;
$$;

CREATE OR REPLACE FUNCTION public.adjust_stock(
  p_product_id text,
  p_new_stock double precision,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  business_id text := public.current_vernex_business_id();
  previous public."ProductStock"%ROWTYPE;
  movement public."InventoryMovement"%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR public.current_vernex_role() NOT IN ('OWNER', 'MANAGER') THEN
    RAISE EXCEPTION 'You do not have permission for this action.';
  END IF;
  IF p_new_stock < 0 THEN RAISE EXCEPTION 'Stock cannot be negative.'; END IF;

  SELECT * INTO previous FROM public."ProductStock"
  WHERE "id" = p_product_id AND "businessId" = business_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product not found.'; END IF;

  UPDATE public."ProductStock" SET "stock" = p_new_stock WHERE "id" = p_product_id;
  INSERT INTO public."InventoryMovement" (
    "businessId", "productId", "productNameSnapshot", "movementType",
    "quantityChange", "previousStock", "newStock", "referenceType", "reason"
  ) VALUES (
    business_id, previous."id", previous."name", 'ADJUSTMENT',
    p_new_stock - previous."stock", previous."stock", p_new_stock, 'ADJUSTMENT', p_reason
  ) RETURNING * INTO movement;

  RETURN jsonb_build_object(
    'product', (SELECT to_jsonb(stock) FROM public."ProductStock" stock WHERE stock."id" = p_product_id),
    'movement', to_jsonb(movement)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.restock_product(
  p_product_id text,
  p_quantity double precision,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  business_id text := public.current_vernex_business_id();
  previous public."ProductStock"%ROWTYPE;
  updated public."ProductStock"%ROWTYPE;
  movement public."InventoryMovement"%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR public.current_vernex_role() NOT IN ('OWNER', 'MANAGER') THEN
    RAISE EXCEPTION 'You do not have permission for this action.';
  END IF;
  IF p_quantity <= 0 THEN RAISE EXCEPTION 'Restock quantity must be positive.'; END IF;

  SELECT * INTO previous FROM public."ProductStock"
  WHERE "id" = p_product_id AND "businessId" = business_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product not found.'; END IF;

  UPDATE public."ProductStock"
  SET "stock" = "stock" + p_quantity
  WHERE "id" = p_product_id
  RETURNING * INTO updated;

  INSERT INTO public."InventoryMovement" (
    "businessId", "productId", "productNameSnapshot", "movementType",
    "quantityChange", "previousStock", "newStock", "referenceType", "reason"
  ) VALUES (
    business_id, previous."id", previous."name", 'RESTOCK',
    p_quantity, previous."stock", updated."stock", 'RESTOCK', p_reason
  ) RETURNING * INTO movement;

  RETURN jsonb_build_object('product', to_jsonb(updated), 'movement', to_jsonb(movement));
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_sale(
  p_transaction_id text,
  p_checkout jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  business_id text := public.current_vernex_business_id();
  staff public."StaffProfile"%ROWTYPE;
  sale public."Transaction"%ROWTYPE;
  shop public."ShopData"%ROWTYPE;
  customer public."Customer"%ROWTYPE;
  line record;
  subtotal_value numeric := 0;
  tax_value numeric := 0;
  discount_value numeric;
  total_value numeric;
  received_value numeric := COALESCE((p_checkout->>'amountReceived')::numeric, 0);
  payment_method text := p_checkout->>'paymentMethod';
  payment_status text := 'PAID';
  bill_number text;
BEGIN
  SELECT * INTO staff FROM public."StaffProfile"
  WHERE "authUserId" = auth.uid()::text AND "status" = 'ACTIVE';
  IF NOT FOUND OR staff."role"::text NOT IN ('OWNER', 'MANAGER', 'CASHIER') THEN
    RAISE EXCEPTION 'You do not have permission for this action.';
  END IF;

  SELECT * INTO sale FROM public."Transaction"
  WHERE "id" = p_transaction_id AND "businessId" = business_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Bill not found.'; END IF;
  IF sale."isComplete" THEN RAISE EXCEPTION 'Bill has already been checked out.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public."OnSaleProduct" WHERE "transactionId" = sale."id") THEN
    RAISE EXCEPTION 'Add at least one product before checkout.';
  END IF;

  SELECT * INTO shop FROM public."ShopData" WHERE "businessId" = business_id LIMIT 1;
  IF NULLIF(p_checkout->>'customerId', '') IS NOT NULL THEN
    SELECT * INTO customer FROM public."Customer"
    WHERE "id" = p_checkout->>'customerId' AND "businessId" = business_id AND "isActive";
    IF NOT FOUND THEN RAISE EXCEPTION 'Selected customer is unavailable.'; END IF;
  END IF;

  FOR line IN
    SELECT item.*, product."sellprice", stock."name" AS stock_name,
      stock."price" AS cost_price, stock."stock" AS available_stock
    FROM public."OnSaleProduct" item
    JOIN public."Product" product ON product."productId" = item."productId"
    JOIN public."ProductStock" stock ON stock."id" = product."productId"
    WHERE item."transactionId" = sale."id"
    FOR UPDATE OF stock
  LOOP
    IF line.quantity > line.available_stock THEN
      RAISE EXCEPTION 'Insufficient stock for %.', line.stock_name;
    END IF;

    subtotal_value := subtotal_value + line.sellprice * line.quantity;
    tax_value := tax_value + line.sellprice * line.quantity *
      (CASE WHEN shop."taxMode"::text = 'NONE' THEN 0 ELSE COALESCE(shop."tax", 0) END / 100);

    UPDATE public."ProductStock"
    SET "stock" = "stock" - line.quantity
    WHERE "id" = line."productId";

    UPDATE public."OnSaleProduct"
    SET "productName" = line.stock_name,
      "unitPrice" = line.sellprice,
      "costPrice" = line.cost_price,
      "taxRate" = CASE WHEN shop."taxMode"::text = 'NONE' THEN 0 ELSE COALESCE(shop."tax", 0) END,
      "lineSubtotal" = line.sellprice * line.quantity,
      "taxAmount" = line.sellprice * line.quantity *
        (CASE WHEN shop."taxMode"::text = 'NONE' THEN 0 ELSE COALESCE(shop."tax", 0) END / 100),
      "lineTotal" = line.sellprice * line.quantity *
        (1 + CASE WHEN shop."taxMode"::text = 'NONE' THEN 0 ELSE COALESCE(shop."tax", 0) END / 100)
    WHERE "id" = line.id;

    INSERT INTO public."InventoryMovement" (
      "businessId", "productId", "productNameSnapshot", "movementType",
      "quantityChange", "previousStock", "newStock", "referenceType", "referenceId", "reason"
    ) VALUES (
      business_id, line."productId", line.stock_name, 'SALE', -line.quantity,
      line.available_stock, line.available_stock - line.quantity, 'SALE', sale."id", 'Completed sale'
    );
  END LOOP;

  discount_value := LEAST(COALESCE((p_checkout->>'discount')::numeric, 0), subtotal_value + tax_value);
  total_value := GREATEST(0, subtotal_value + tax_value - discount_value);
  IF payment_method <> 'CREDIT' AND received_value < total_value THEN
    RAISE EXCEPTION 'Amount received must cover the grand total.';
  END IF;
  IF payment_method = 'CREDIT' THEN
    payment_status := CASE WHEN received_value >= total_value THEN 'PAID'
      WHEN received_value > 0 THEN 'PARTIAL' ELSE 'PENDING' END;
  END IF;

  bill_number := public.generate_bill_number(business_id);
  UPDATE public."Transaction"
  SET "subtotal" = subtotal_value, "discount" = discount_value, "taxAmount" = tax_value,
    "totalAmount" = total_value, "amountReceived" = received_value,
    "changeAmount" = GREATEST(0, received_value - total_value), "billNumber" = bill_number,
    "customerId" = customer."id",
    "customerName" = COALESCE(customer."name", NULLIF(p_checkout->>'customerName', '')),
    "customerPhone" = COALESCE(customer."phone", NULLIF(p_checkout->>'customerPhone', '')),
    "customerEmail" = COALESCE(customer."email", NULLIF(p_checkout->>'customerEmail', '')),
    "customerAddress" = COALESCE(customer."address", NULLIF(p_checkout->>'customerAddress', '')),
    "customerTaxId" = COALESCE(customer."taxId", NULLIF(p_checkout->>'customerTaxId', '')),
    "paymentMethod" = payment_method::public."PaymentMethod",
    "paymentStatus" = payment_status::public."PaymentStatus",
    "completedAt" = now(), "isComplete" = true
  WHERE "id" = sale."id"
  RETURNING * INTO sale;

  UPDATE public."InventoryMovement"
  SET "referenceBillNumber" = bill_number
  WHERE "referenceId" = sale."id" AND "movementType" = 'SALE';

  INSERT INTO public."AuditLog" (
    "businessId", "userId", "userNameSnapshot", "roleSnapshot", "action",
    "entityType", "entityId", "referenceNumber", "description", "metadata"
  ) VALUES (
    business_id, staff."id", staff."name", staff."role", 'SALE_COMPLETED',
    'Transaction', sale."id", bill_number, 'Completed sale ' || bill_number,
    jsonb_build_object('totalAmount', total_value, 'paymentMethod', payment_method)
  );

  RETURN to_jsonb(sale) || jsonb_build_object(
    'products', (SELECT COALESCE(jsonb_agg(to_jsonb(item)), '[]'::jsonb)
                 FROM public."OnSaleProduct" item WHERE item."transactionId" = sale."id")
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.process_return(
  p_transaction_id text,
  p_refund_method text,
  p_reason text,
  p_items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  business_id text := public.current_vernex_business_id();
  staff public."StaffProfile"%ROWTYPE;
  sale public."Transaction"%ROWTYPE;
  returned public."SaleReturn"%ROWTYPE;
  requested jsonb;
  line public."OnSaleProduct"%ROWTYPE;
  prior_quantity integer;
  refund_value numeric := 0;
  unit_refund numeric;
  total_sold integer;
  total_returned integer;
  return_status text;
  stock public."ProductStock"%ROWTYPE;
BEGIN
  SELECT * INTO staff FROM public."StaffProfile"
  WHERE "authUserId" = auth.uid()::text AND "status" = 'ACTIVE';
  IF NOT FOUND OR staff."role"::text NOT IN ('OWNER', 'MANAGER') THEN
    RAISE EXCEPTION 'You do not have permission for this action.';
  END IF;

  SELECT * INTO sale FROM public."Transaction"
  WHERE "id" = p_transaction_id AND "businessId" = business_id AND "isComplete" FOR UPDATE;
  IF NOT FOUND OR sale."billNumber" IS NULL THEN RAISE EXCEPTION 'Completed sale not found.'; END IF;

  FOR requested IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT * INTO line FROM public."OnSaleProduct"
    WHERE "id" = requested->>'saleLineId' AND "transactionId" = sale."id";
    IF NOT FOUND THEN RAISE EXCEPTION 'A selected sale item was not found.'; END IF;
    SELECT COALESCE(sum("quantity"), 0) INTO prior_quantity
    FROM public."ReturnItem" item JOIN public."SaleReturn" ret ON ret."id" = item."saleReturnId"
    WHERE item."onSaleProductId" = line."id";
    IF (requested->>'quantity')::integer > line."quantity" - prior_quantity THEN
      RAISE EXCEPTION 'Return quantity exceeds available quantity for %.', line."productName";
    END IF;
    unit_refund := CASE WHEN line."quantity" > 0
      THEN line."lineTotal" / line."quantity" *
        (CASE WHEN sale."subtotal" + sale."taxAmount" > 0
          THEN sale."totalAmount" / (sale."subtotal" + sale."taxAmount") ELSE 0 END)
      ELSE 0 END;
    refund_value := refund_value + unit_refund * (requested->>'quantity')::integer;
  END LOOP;

  SELECT COALESCE(sum("quantity"), 0) INTO total_sold
  FROM public."OnSaleProduct" WHERE "transactionId" = sale."id";
  SELECT COALESCE(sum(item."quantity"), 0) INTO total_returned
  FROM public."ReturnItem" item JOIN public."SaleReturn" ret ON ret."id" = item."saleReturnId"
  WHERE ret."originalTransactionId" = sale."id";
  total_returned := total_returned +
    (SELECT COALESCE(sum((value->>'quantity')::integer), 0) FROM jsonb_array_elements(p_items));
  return_status := CASE WHEN total_returned = total_sold THEN 'RETURNED' ELSE 'PARTIAL' END;

  INSERT INTO public."SaleReturn" (
    "businessId", "originalTransactionId", "originalBillNumber", "refundAmount",
    "refundMethod", "reason", "status"
  ) VALUES (
    business_id, sale."id", sale."billNumber", refund_value,
    p_refund_method::public."PaymentMethod", p_reason, return_status::public."ReturnStatus"
  ) RETURNING * INTO returned;

  FOR requested IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT * INTO line FROM public."OnSaleProduct" WHERE "id" = requested->>'saleLineId';
    IF line."productId" IS NULL THEN RAISE EXCEPTION '% can no longer be returned to stock.', line."productName"; END IF;
    SELECT * INTO stock FROM public."ProductStock"
    WHERE "id" = line."productId" AND "businessId" = business_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION '% no longer exists.', line."productName"; END IF;
    unit_refund := CASE WHEN line."quantity" > 0
      THEN line."lineTotal" / line."quantity" *
        (CASE WHEN sale."subtotal" + sale."taxAmount" > 0
          THEN sale."totalAmount" / (sale."subtotal" + sale."taxAmount") ELSE 0 END)
      ELSE 0 END;

    UPDATE public."ProductStock" SET "stock" = "stock" + (requested->>'quantity')::integer
    WHERE "id" = stock."id";
    INSERT INTO public."ReturnItem" (
      "saleReturnId", "onSaleProductId", "productId", "productName",
      "quantity", "unitRefund", "refundAmount"
    ) VALUES (
      returned."id", line."id", line."productId", line."productName",
      (requested->>'quantity')::integer, unit_refund,
      unit_refund * (requested->>'quantity')::integer
    );
    INSERT INTO public."InventoryMovement" (
      "businessId", "productId", "productNameSnapshot", "movementType",
      "quantityChange", "previousStock", "newStock", "referenceType",
      "referenceId", "referenceBillNumber", "reason"
    ) VALUES (
      business_id, stock."id", line."productName", 'RETURN',
      (requested->>'quantity')::integer, stock."stock",
      stock."stock" + (requested->>'quantity')::integer, 'RETURN',
      returned."id", sale."billNumber", p_reason
    );
  END LOOP;

  UPDATE public."Transaction"
  SET "returnStatus" = return_status::public."ReturnStatus",
    "refundedAmount" = "refundedAmount" + refund_value
  WHERE "id" = sale."id";

  INSERT INTO public."AuditLog" (
    "businessId", "userId", "userNameSnapshot", "roleSnapshot", "action",
    "entityType", "entityId", "referenceNumber", "description", "metadata"
  ) VALUES (
    business_id, staff."id", staff."name", staff."role", 'RETURN_CREATED',
    'SaleReturn', returned."id", sale."billNumber",
    'Created return for ' || sale."billNumber", jsonb_build_object('refundAmount', refund_value)
  );

  RETURN to_jsonb(returned) || jsonb_build_object(
    'items', (SELECT COALESCE(jsonb_agg(to_jsonb(item)), '[]'::jsonb)
              FROM public."ReturnItem" item WHERE item."saleReturnId" = returned."id")
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.activate_business(p_business_id text, p_plan_name text DEFAULT 'Active')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE activated public."Business"%ROWTYPE;
BEGIN
  IF COALESCE((auth.jwt()->'app_metadata'->>'vernex_super_admin')::boolean, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'You do not have permission for this action.';
  END IF;
  UPDATE public."Business"
  SET "subscriptionStatus" = 'ACTIVE', "planName" = p_plan_name,
    "activatedAt" = now(), "suspendedAt" = NULL, "updatedAt" = now()
  WHERE "id" = p_business_id RETURNING * INTO activated;
  IF NOT FOUND THEN RAISE EXCEPTION 'Business not found.'; END IF;
  RETURN to_jsonb(activated);
END;
$$;

CREATE OR REPLACE FUNCTION public.onboard_business(
  p_business_name text,
  p_owner_name text,
  p_phone text,
  p_country text,
  p_currency text,
  p_tax_mode text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  auth_user uuid := auth.uid();
  auth_email text;
  business public."Business"%ROWTYPE;
  owner public."StaffProfile"%ROWTYPE;
  shop public."ShopData"%ROWTYPE;
BEGIN
  IF auth_user IS NULL THEN RAISE EXCEPTION 'Unauthenticated.'; END IF;
  SELECT email INTO auth_email FROM auth.users WHERE id = auth_user;
  IF auth_email IS NULL THEN RAISE EXCEPTION 'Authenticated email is unavailable.'; END IF;
  IF EXISTS (SELECT 1 FROM public."StaffProfile" WHERE "authUserId" = auth_user::text) THEN
    RAISE EXCEPTION 'This account already belongs to a business.';
  END IF;

  INSERT INTO public."Business" (
    "name", "country", "currency", "taxMode", "ownerUserId",
    "trialStartedAt", "trialEndsAt", "subscriptionStatus", "planName"
  ) VALUES (
    p_business_name, p_country, p_currency, p_tax_mode::public."TaxMode", auth_user::text,
    now(), now() + interval '14 days', 'TRIAL', 'Free Trial'
  ) RETURNING * INTO business;

  INSERT INTO public."StaffProfile" (
    "authUserId", "businessId", "name", "email", "phone", "role", "status"
  ) VALUES (
    auth_user::text, business."id", p_owner_name, lower(auth_email), NULLIF(p_phone, ''), 'OWNER', 'ACTIVE'
  ) RETURNING * INTO owner;

  INSERT INTO public."ShopData" (
    "businessId", "name", "country", "currency", "taxMode", "phone"
  ) VALUES (
    business."id", p_business_name, p_country, p_currency, p_tax_mode::public."TaxMode", NULLIF(p_phone, '')
  ) RETURNING * INTO shop;

  INSERT INTO public."BillSequence" ("id", "businessId", "nextNumber")
  VALUES (business."id", business."id", 1);

  RETURN jsonb_build_object('business', to_jsonb(business), 'owner', to_jsonb(owner), 'shopData', to_jsonb(shop));
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_bill_number(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_stock(text, double precision, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restock_product(text, double precision, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_sale(text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_return(text, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.activate_business(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.onboard_business(text, text, text, text, text, text) TO authenticated;
