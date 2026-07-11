CREATE OR REPLACE FUNCTION public.add_product_to_bill(
  p_transaction_id text,
  p_product_id text,
  p_quantity integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  business_id text := public.current_vernex_business_id();
  sale public."Transaction"%ROWTYPE;
  product_row record;
  existing public."OnSaleProduct"%ROWTYPE;
  saved public."OnSaleProduct"%ROWTYPE;
  next_quantity integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated.';
  END IF;

  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Qty must be a positive number.';
  END IF;

  SELECT * INTO sale
  FROM public."Transaction"
  WHERE "id" = p_transaction_id
    AND "businessId" = business_id
  FOR UPDATE;

  IF NOT FOUND OR sale."isComplete" THEN
    RAISE EXCEPTION 'Bill is missing or already completed.';
  END IF;

  SELECT
    product."sellprice",
    stock."id" AS "stockId",
    stock."name",
    stock."price",
    stock."stock"
  INTO product_row
  FROM public."Product" product
  JOIN public."ProductStock" stock ON stock."id" = product."productId"
  WHERE product."productId" = p_product_id
    AND stock."businessId" = business_id
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product is not sellable.';
  END IF;

  SELECT * INTO existing
  FROM public."OnSaleProduct"
  WHERE "productId" = p_product_id
    AND "transactionId" = p_transaction_id
  FOR UPDATE;

  next_quantity := COALESCE(existing."quantity", 0) + p_quantity;

  IF next_quantity > product_row."stock" THEN
    RAISE EXCEPTION 'Only % units are available.', product_row."stock";
  END IF;

  IF existing."id" IS NOT NULL THEN
    UPDATE public."OnSaleProduct"
    SET "quantity" = next_quantity
    WHERE "id" = existing."id"
    RETURNING * INTO saved;
  ELSE
    INSERT INTO public."OnSaleProduct" (
      "transactionId",
      "productId",
      "quantity",
      "productName",
      "unitPrice",
      "costPrice"
    ) VALUES (
      p_transaction_id,
      p_product_id,
      p_quantity,
      product_row."name",
      product_row."sellprice",
      product_row."price"
    )
    RETURNING * INTO saved;
  END IF;

  RETURN to_jsonb(saved);
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_product_to_bill(text, text, integer) TO authenticated;
