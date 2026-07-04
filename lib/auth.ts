import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { Prisma, StaffStatus, UserRole } from '@prisma/client';
import { db } from '@/lib/db';
import { hasPermission, isRoleAllowed, Permission } from '@/lib/permissions';
import { getServerSupabase } from '@/lib/supabase.server';

let defaultBusinessReady: Promise<unknown> | null = null;
const testStaffReady = new Map<string, Promise<unknown>>();
const lastLoginUpdates = new Map<string, number>();
const ownerPlaceholderIds = [
  'vernex-owner-auth-user',
  'demo-owner-auth-user',
  'phase6-owner',
];

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

export type CurrentUserContext = {
  authUserId: string;
  staffId: string;
  businessId: string;
  name: string;
  email: string;
  role: UserRole;
};

export async function ensureDefaultBusiness() {
  if (defaultBusinessReady) return defaultBusinessReady;
  defaultBusinessReady = (async () => {
    const business = await db.business.findFirst({
      orderBy: { createdAt: 'asc' },
    });
    if (!business) {
      throw new AuthError('Vernex is not initialized. Run the Prisma seed command.', 503);
    }
    return business;
  })().catch((error) => {
    defaultBusinessReady = null;
    throw error;
  });
  return defaultBusinessReady;
}

async function userFromBearer(request?: Request) {
  const authHeader = request?.headers.get('authorization') ?? '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const cookieToken = (await cookies()).get('vernex-access-token')?.value;
  const token = bearer || cookieToken;
  const client = token ? getServerSupabase() : null;
  if (!token || !client) return null;
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

export async function getCurrentUserContext(request?: Request): Promise<CurrentUserContext> {
  const testRole = request?.headers.get('x-vernex-test-role') as UserRole | null;
  const requestedBusinessId = request?.headers.get('x-vernex-test-business');
  if (process.env.NODE_ENV !== 'production' && testRole && ['OWNER', 'MANAGER', 'CASHIER'].includes(testRole)) {
    const business = await ensureDefaultBusiness() as Awaited<ReturnType<typeof db.business.findFirst>>;
    if (!business) throw new AuthError('Vernex is not initialized. Run the Prisma seed command.', 503);
    const testBusinessId = requestedBusinessId || business.id;
    const key = `${testBusinessId}:${testRole}`;
    if (!testStaffReady.has(key)) {
      testStaffReady.set(key, db.staffProfile.upsert({
      where: { authUserId: `vernex-test-${testRole.toLowerCase()}` },
      update: { role: testRole, status: 'ACTIVE', businessId: testBusinessId },
      create: {
        authUserId: `vernex-test-${testRole.toLowerCase()}`,
        businessId: testBusinessId,
        name: `Vernex Test ${testRole}`,
        email: `test-${testRole.toLowerCase()}@vernex.app`,
        role: testRole,
        status: 'ACTIVE',
      },
      }));
    }
    const staff = await testStaffReady.get(key) as Awaited<ReturnType<typeof db.staffProfile.upsert>>;
    return { authUserId: staff.authUserId, staffId: staff.id, businessId: staff.businessId, name: staff.name, email: staff.email, role: staff.role };
  }

  const user = await userFromBearer(request);
  if (user) {
    const email = user.email ?? '';
    let staff = await db.staffProfile.findUnique({ where: { authUserId: user.id } });
    if (!staff && email) {
      staff = await db.staffProfile.findUnique({ where: { email } });
      if (staff) staff = await db.staffProfile.update({ where: { id: staff.id }, data: { authUserId: user.id } });
    }
    if (!staff && email) {
      staff = await db.$transaction(async (tx) => {
        const business = await tx.business.findFirst({
          where: { ownerUserId: { in: ownerPlaceholderIds } },
          orderBy: { createdAt: 'asc' },
        });
        if (!business) return null;
        const placeholder = await tx.staffProfile.findFirst({
          where: {
            authUserId: business.ownerUserId,
            businessId: business.id,
            role: UserRole.OWNER,
            status: StaffStatus.ACTIVE,
          },
          orderBy: { createdAt: 'asc' },
        });
        if (!placeholder) return null;
        const claimed = await tx.staffProfile.updateMany({
          where: { id: placeholder.id, authUserId: { in: ownerPlaceholderIds } },
          data: { authUserId: user.id, email },
        });
        if (!claimed.count) return null;
        await tx.business.update({
          where: { id: business.id },
          data: { ownerUserId: user.id },
        });
        return tx.staffProfile.findUnique({ where: { id: placeholder.id } });
      });
    }
    if (!staff) throw new AuthError('You do not have permission to access this workspace.', 403);
    if (staff.status !== StaffStatus.ACTIVE) throw new AuthError('Your account is inactive. Contact the business owner.', 403);
    const now = Date.now();
    if (now - (lastLoginUpdates.get(staff.id) ?? 0) > 5 * 60 * 1000) {
      await db.staffProfile.update({ where: { id: staff.id }, data: { lastLoginAt: new Date(now) } });
      lastLoginUpdates.set(staff.id, now);
    }
    return { authUserId: user.id, staffId: staff.id, businessId: staff.businessId, name: staff.name, email: staff.email, role: staff.role };
  }

  if (process.env.NODE_ENV !== 'production') {
    const business = await ensureDefaultBusiness() as Awaited<ReturnType<typeof db.business.findFirst>>;
    if (!business) throw new AuthError('Vernex is not initialized. Run the Prisma seed command.', 503);
    const staff = await db.staffProfile.findFirstOrThrow({
      where: { businessId: business.id, role: UserRole.OWNER, status: StaffStatus.ACTIVE },
      orderBy: { createdAt: 'asc' },
    });
    return { authUserId: staff.authUserId, staffId: staff.id, businessId: staff.businessId, name: staff.name, email: staff.email, role: staff.role };
  }

  throw new AuthError('Unauthenticated.', 401);
}

export async function requireAuth(request?: Request) {
  return getCurrentUserContext(request);
}

export async function requireRole(request: Request | undefined, roles: UserRole[]) {
  const ctx = await getCurrentUserContext(request);
  if (!isRoleAllowed(ctx.role, roles)) throw new AuthError('You do not have permission for this action.', 403);
  return ctx;
}

export async function requirePermission(request: Request | undefined, permission: Permission) {
  const ctx = await getCurrentUserContext(request);
  if (!hasPermission(ctx.role, permission)) throw new AuthError('You do not have permission for this action.', 403);
  return ctx;
}

export function authErrorResponse(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (
    error instanceof Prisma.PrismaClientInitializationError ||
    error instanceof Prisma.PrismaClientKnownRequestError ||
    error instanceof Prisma.PrismaClientUnknownRequestError
  ) {
    return NextResponse.json(
      { error: 'Database is temporarily unavailable. Please try again shortly.' },
      { status: 503 }
    );
  }
  return null;
}
