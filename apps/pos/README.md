# Vernex

Vernex is a production billing and business operations application for sales,
products, inventory, customers, staff, receipts, returns, and reporting.

## Local Setup

1. Copy `.env.example` to `.env` and provide valid Supabase and activation values.
2. Install dependencies with `npm install`.
3. Apply `supabase/migrations` and deploy the functions under `supabase/functions`.
4. Start the application with `npm run dev`.

The application is available at `http://localhost:3000`.

## Validation

```powershell
npx tsc --noEmit
npm run lint
npm run build
npm audit
```

Never commit local environment files or production credentials.

## SaaS Integration

The customer POS and sibling `vernex-super-admin-portal` remain separate Next.js applications connected to the same Supabase project.

- Supabase Auth identifies each POS user.
- `StaffProfile.authUserId` resolves the user to one required `businessId`.
- Every tenant-owned table requires `businessId`.
- POS APIs scope reads and writes to the authenticated business.
- Supabase RLS exposes tenant reads only for the current business.
- One Auth user carries the `vernex_super_admin` application claim for portal-wide access.
- Privileged Auth provisioning and password reset/deletion stay server-only in the portal.

Run `node scripts/verify-master-integration.mjs` against a development server on port 3001 to verify cross-tenant isolation.
