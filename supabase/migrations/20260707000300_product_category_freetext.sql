-- Allow user-defined product categories.
-- Convert public."ProductStock".cat from the fixed public."CatProduct" enum to
-- free text so businesses can create their own categories. Existing category
-- values (ELECTRO, DRINK, FOOD, FASHION, STATIONERY) are preserved as text.
ALTER TABLE public."ProductStock"
  ALTER COLUMN cat TYPE text USING cat::text;
