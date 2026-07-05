DO $$
DECLARE
  primary_business_id TEXT;
BEGIN
  SELECT "id" INTO primary_business_id
  FROM "Business"
  ORDER BY "createdAt" ASC
  LIMIT 1;

  IF primary_business_id IS NULL THEN
    RAISE EXCEPTION 'A Business row is required before enforcing tenant ownership.';
  END IF;

  UPDATE "ProductStock" SET "businessId" = primary_business_id WHERE "businessId" IS NULL;
  UPDATE "Transaction" SET "businessId" = primary_business_id WHERE "businessId" IS NULL;
  UPDATE "Customer" SET "businessId" = primary_business_id WHERE "businessId" IS NULL;
  UPDATE "InventoryMovement" SET "businessId" = primary_business_id WHERE "businessId" IS NULL;
  UPDATE "SaleReturn" SET "businessId" = primary_business_id WHERE "businessId" IS NULL;
  UPDATE "ShopData" SET "businessId" = primary_business_id WHERE "businessId" IS NULL;
  UPDATE "BillSequence" SET "businessId" = primary_business_id WHERE "businessId" IS NULL;
END $$;

ALTER TABLE "ProductStock" ALTER COLUMN "businessId" SET NOT NULL;
ALTER TABLE "Transaction" ALTER COLUMN "businessId" SET NOT NULL;
ALTER TABLE "Customer" ALTER COLUMN "businessId" SET NOT NULL;
ALTER TABLE "InventoryMovement" ALTER COLUMN "businessId" SET NOT NULL;
ALTER TABLE "SaleReturn" ALTER COLUMN "businessId" SET NOT NULL;
ALTER TABLE "ShopData" ALTER COLUMN "businessId" SET NOT NULL;
ALTER TABLE "BillSequence" ALTER COLUMN "businessId" SET NOT NULL;

ALTER TABLE "ProductStock" DROP CONSTRAINT IF EXISTS "ProductStock_businessId_fkey";
ALTER TABLE "ProductStock" ADD CONSTRAINT "ProductStock_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Transaction" DROP CONSTRAINT IF EXISTS "Transaction_businessId_fkey";
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Customer" DROP CONSTRAINT IF EXISTS "Customer_businessId_fkey";
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryMovement" DROP CONSTRAINT IF EXISTS "InventoryMovement_businessId_fkey";
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SaleReturn" DROP CONSTRAINT IF EXISTS "SaleReturn_businessId_fkey";
ALTER TABLE "SaleReturn" ADD CONSTRAINT "SaleReturn_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShopData" DROP CONSTRAINT IF EXISTS "ShopData_businessId_fkey";
ALTER TABLE "ShopData" ADD CONSTRAINT "ShopData_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BillSequence" DROP CONSTRAINT IF EXISTS "BillSequence_businessId_fkey";
ALTER TABLE "BillSequence" ADD CONSTRAINT "BillSequence_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
