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
    SELECT
      item.*,
      product."sellprice" AS base_sellprice,
      stock."name" AS stock_name,
      stock."price" AS cost_price,
      stock."stock" AS available_stock,
      COALESCE(NULLIF(item."productName", ''), stock."name") AS effective_product_name,
      COALESCE(item."unitPrice", product."sellprice") AS effective_unit_price
    FROM public."OnSaleProduct" item
    JOIN public."Product" product ON product."productId" = item."productId"
    JOIN public."ProductStock" stock ON stock."id" = product."productId"
    WHERE item."transactionId" = sale."id"
    FOR UPDATE OF stock
  LOOP
    IF line.quantity > line.available_stock THEN
      RAISE EXCEPTION 'Insufficient stock for %.', line.stock_name;
    END IF;

    subtotal_value := subtotal_value + line.effective_unit_price * line.quantity;
    tax_value := tax_value + line.effective_unit_price * line.quantity *
      (CASE WHEN shop."taxMode"::text = 'NONE' THEN 0 ELSE COALESCE(shop."tax", 0) END / 100);

    UPDATE public."ProductStock"
    SET "stock" = "stock" - line.quantity
    WHERE "id" = line."productId";

    UPDATE public."OnSaleProduct"
    SET "productName" = line.effective_product_name,
      "unitPrice" = line.effective_unit_price,
      "costPrice" = COALESCE(line."costPrice", line.cost_price),
      "taxRate" = CASE WHEN shop."taxMode"::text = 'NONE' THEN 0 ELSE COALESCE(shop."tax", 0) END,
      "lineSubtotal" = line.effective_unit_price * line.quantity,
      "taxAmount" = line.effective_unit_price * line.quantity *
        (CASE WHEN shop."taxMode"::text = 'NONE' THEN 0 ELSE COALESCE(shop."tax", 0) END / 100),
      "lineTotal" = line.effective_unit_price * line.quantity *
        (1 + CASE WHEN shop."taxMode"::text = 'NONE' THEN 0 ELSE COALESCE(shop."tax", 0) END / 100)
    WHERE "id" = line.id;

    INSERT INTO public."InventoryMovement" (
      "businessId", "productId", "productNameSnapshot", "movementType",
      "quantityChange", "previousStock", "newStock", "referenceType", "referenceId", "reason"
    ) VALUES (
      business_id, line."productId", line.effective_product_name, 'SALE', -line.quantity,
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

GRANT EXECUTE ON FUNCTION public.complete_sale(text, jsonb) TO authenticated;
