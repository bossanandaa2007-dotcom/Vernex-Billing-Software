# Supabase Migration Audit

## Current Data Layer

Prisma is the active application data layer. Supabase currently provides authentication,
while `apps/pos/lib/db.ts` supplies Prisma access to server routes, server components,
data loaders, authorization context, reports, and transactional billing operations.

## Prisma Models

- User
- ProductStock
- Product
- OnSaleProduct
- Transaction
- Customer
- InventoryMovement
- SaleReturn
- ReturnItem
- ShopData
- BillSequence
- Business
- StaffProfile
- AuditLog

## Direct Prisma Dependencies

- `apps/pos/lib/db.ts`
- `apps/pos/lib/auth.ts`
- `apps/pos/lib/audit.ts`
- `apps/pos/lib/permissions.ts`
- `apps/pos/lib/report-calculations.ts`
- `apps/pos/lib/subscription.ts`
- `apps/pos/lib/user-id-auth.ts`
- `apps/pos/data/product.ts`
- `apps/pos/data/records.ts`
- `apps/pos/app/(root)/inventory/page.tsx`
- POS API routes for admin activation, audit logs, setup status, customers,
  dashboard, favorites, inventory, onboarding, products, sales, restocking,
  returns, shop settings, staff, storage, subscriptions, and transactions

## Atomic Workflows Requiring RPC Replacement

- Checkout and stock deduction
- Returns, refunds, and stock restoration
- Manual stock adjustment
- Product restocking
- Sequential bill-number generation
- Onboarding and initial business creation

## Existing Supabase State

- Browser and server Supabase clients exist.
- The server client uses the anonymous key and is not request-session scoped.
- Existing SQL enables tenant read policies for part of the schema.
- Complete role-aware CRUD policies are not present.
- Required billing, return, stock, and bill-number RPC functions are not present.
- Supabase Edge Functions are not present.
- Generated database types are not present.

## Required Gate Before Runtime Replacement

Capture the remote schema and generate types with the official Supabase CLI. The CLI
requires Docker Desktop or Podman for both operations in this environment. Prisma must
remain active until schema parity, RLS tests, RPC transaction tests, and route-level
verification all pass.
