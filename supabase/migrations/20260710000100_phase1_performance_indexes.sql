-- Phase 1 performance indexes for POS/admin read paths and RLS helper lookups.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "Transaction_businessId_isComplete_completedAt_idx"
ON public."Transaction" ("businessId", "isComplete", "completedAt" DESC);

CREATE INDEX IF NOT EXISTS "Transaction_businessId_completedAt_idx"
ON public."Transaction" ("businessId", "completedAt" DESC);

CREATE INDEX IF NOT EXISTS "Transaction_businessId_customerId_completedAt_idx"
ON public."Transaction" ("businessId", "customerId", "completedAt" DESC);

CREATE INDEX IF NOT EXISTS "Transaction_billNumber_trgm_idx"
ON public."Transaction" USING gin ("billNumber" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Transaction_customerName_trgm_idx"
ON public."Transaction" USING gin ("customerName" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Transaction_customerPhone_trgm_idx"
ON public."Transaction" USING gin ("customerPhone" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "OnSaleProduct_transactionId_idx"
ON public."OnSaleProduct" ("transactionId");

CREATE INDEX IF NOT EXISTS "OnSaleProduct_productId_idx"
ON public."OnSaleProduct" ("productId");

CREATE INDEX IF NOT EXISTS "ProductStock_businessId_name_idx"
ON public."ProductStock" ("businessId", "name");

CREATE INDEX IF NOT EXISTS "ProductStock_businessId_cat_name_idx"
ON public."ProductStock" ("businessId", "cat", "name");

CREATE INDEX IF NOT EXISTS "ProductStock_id_businessId_idx"
ON public."ProductStock" ("id", "businessId");

CREATE INDEX IF NOT EXISTS "ProductStock_name_trgm_idx"
ON public."ProductStock" USING gin ("name" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Customer_businessId_isActive_updatedAt_idx"
ON public."Customer" ("businessId", "isActive", "updatedAt" DESC);

CREATE INDEX IF NOT EXISTS "Customer_businessId_isActive_createdAt_idx"
ON public."Customer" ("businessId", "isActive", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "Customer_name_trgm_idx"
ON public."Customer" USING gin ("name" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Customer_phone_trgm_idx"
ON public."Customer" USING gin ("phone" gin_trgm_ops);

DROP INDEX IF EXISTS public."ShopData_businessId_unique_idx";

CREATE INDEX IF NOT EXISTS "ShopData_businessId_lookup_idx"
ON public."ShopData" ("businessId");

CREATE INDEX IF NOT EXISTS "StaffProfile_authUserId_status_idx"
ON public."StaffProfile" ("authUserId", "status");

CREATE INDEX IF NOT EXISTS "Transaction_id_businessId_idx"
ON public."Transaction" ("id", "businessId");

CREATE INDEX IF NOT EXISTS "SaleReturn_businessId_createdAt_idx"
ON public."SaleReturn" ("businessId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "SaleReturn_id_businessId_idx"
ON public."SaleReturn" ("id", "businessId");

CREATE INDEX IF NOT EXISTS "ReturnItem_saleReturnId_idx"
ON public."ReturnItem" ("saleReturnId");
