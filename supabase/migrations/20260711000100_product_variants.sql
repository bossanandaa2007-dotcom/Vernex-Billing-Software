CREATE TABLE IF NOT EXISTS public."ProductVariant" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "productId" text NOT NULL REFERENCES public."ProductStock"("id") ON DELETE CASCADE,
  "businessId" text NOT NULL REFERENCES public."Business"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "price" numeric(12,2) NOT NULL CHECK ("price" >= 0),
  "sku" text,
  "sortOrder" integer NOT NULL DEFAULT 0,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_variant_business_product
  ON public."ProductVariant" ("businessId", "productId", "sortOrder");

ALTER TABLE public."ProductVariant" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS product_variant_select_own_business ON public."ProductVariant";
CREATE POLICY product_variant_select_own_business ON public."ProductVariant"
FOR SELECT USING (
  "businessId" = public.current_vernex_business_id()
);

DROP POLICY IF EXISTS product_variant_write_own_business ON public."ProductVariant";
CREATE POLICY product_variant_write_own_business ON public."ProductVariant"
FOR ALL USING (
  "businessId" = public.current_vernex_business_id()
) WITH CHECK (
  "businessId" = public.current_vernex_business_id()
);
