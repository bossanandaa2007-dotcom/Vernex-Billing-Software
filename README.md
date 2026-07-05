# Vernex

Production monorepo for the Vernex POS and Super Admin applications.

## Structure

```text
apps/
  pos/        Full-stack Next.js POS
  admin/      Independent Next.js Super Admin Portal
packages/
  ui/
  supabase/
  types/
  utils/
  validation/
  config/
docs/
scripts/
```

The POS remains full-stack. Its API routes, middleware, Prisma schema, authentication, server actions, and UI stay together to preserve same-origin behavior.

Shared package folders are intentionally empty until an implementation is genuinely identical in both applications. POS and Admin currently use different React, Tailwind, Zod, Supabase, and UI dependency versions.

## Installation

### npm

```powershell
npm install
npm run install:apps
```

### pnpm

```powershell
corepack pnpm install
```

## Environment

Keep secrets local to each application:

- `apps/pos/.env` or `apps/pos/.env.local`
- `apps/admin/.env` or `apps/admin/.env.local`

Use each app's `.env.example` as the variable reference. Variable names and database connections were not changed.

## Development

```powershell
npm run dev:pos
npm run dev:admin
```

- POS: `http://localhost:3000`
- Admin: `http://localhost:3100`

## Validation

```powershell
npm run typecheck
npm run lint
npm run build
```

## Vercel

Create two projects from this repository:

- POS Root Directory: `apps/pos`
- Admin Root Directory: `apps/admin`

Each app retains its original Next.js configuration and can be deployed independently.

See [docs/architecture.md](docs/architecture.md) and [docs/vercel.md](docs/vercel.md).
