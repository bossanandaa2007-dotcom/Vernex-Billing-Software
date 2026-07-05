# Vernex Super Admin Portal

Separate platform-owner application for managing Vernex customer businesses.

## Environment

Copy `.env.example` to `.env.local` and configure:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPER_ADMIN_EMAIL` - the only account permitted to enter the portal
- `SUPABASE_SERVICE_ROLE_KEY` - optional until provisioning, password reset, suspension, and deletion actions are enabled

The service-role key is server-only and must never use a `NEXT_PUBLIC_` prefix.

## Supabase access

Read pages use the authenticated Super Admin session and expect RLS policies that permit the configured account to read existing Vernex tables. Privileged lifecycle actions use the server-only service-role client.

No POS schema changes or payment integration are included.

The POS migration `20260703010000_shared_platform_rls` marks exactly one Auth user with the `vernex_super_admin` application claim. Portal reads and routine business/trial updates use that authenticated JWT under RLS. `SUPABASE_SERVICE_ROLE_KEY` is required only for owner provisioning, Auth password resets, and Auth user deletion.

Business provisioning uses the existing `Business`, `StaffProfile`, `ShopData`, and `BillSequence` tables. No duplicate portal schema is created.

## Commands

```bash
npm install
npm run dev
npm run lint
npm run build
npm start
```
