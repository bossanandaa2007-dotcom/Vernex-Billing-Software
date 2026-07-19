# Vercel Deployment

The POS app is the single application. The Super Admin portal is merged into it
and served at `/super-admin` from the same deployment — there is no separate
Admin project or domain.

## POS Project (single app)

- Root Directory: `apps/pos`
- Framework: Next.js
- Install Command: `npm install`
- Build Command: `npm run build`
- Output: `.next`

Configure the POS environment variables, including the merged Super Admin ones:

- `SUPER_ADMIN_EMAIL` — a login with this email is routed to `/super-admin`.
- `SUPABASE_SERVICE_ROLE_KEY` — privileged key for platform operations (server-only).
- `DATABASE_URL` — pooled Postgres connection.

Keep database URLs, service-role keys, and admin secrets server-only (never in
`NEXT_PUBLIC_*`).

## Domains

- `app.vernex.in` -> POS project (also serves the Super Admin section at `/super-admin`)
