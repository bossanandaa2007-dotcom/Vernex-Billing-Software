# Architecture

## POS

`apps/pos` is the existing full-stack Next.js application. API routes, middleware, Prisma, authentication, server utilities, UI, and route structure remain unchanged.

## Admin

`apps/admin` is the existing independent Next.js Super Admin application. It retains its own middleware, APIs, Supabase services, configuration, and environment.

## Shared Boundaries

The `packages` directories are ownership boundaries, not forced abstractions. No implementation was extracted because the applications currently use incompatible major versions of React and supporting UI libraries. Extracting those files would change dependency resolution and violate the zero-regression requirement.

Future shared code must:

1. Be behaviorally identical in both apps.
2. Have no application-specific imports.
3. Avoid server secrets unless it lives in a server-only package.
4. Pass both app builds before migration.
