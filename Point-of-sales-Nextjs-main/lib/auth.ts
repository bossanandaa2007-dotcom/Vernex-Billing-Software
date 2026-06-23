import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { StaffStatus, UserRole } from '@prisma/client';
import { db } from '@/lib/db';
import { hasPermission, isRoleAllowed, Permission } from '@/lib/permissions';

const DEFAULT_BUSINESS_ID = 'vernex-demo-business';
const DEMO_AUTH_USER_ID = 'demo-owner-auth-user';
const DEMO_EMAIL = 'owner@vernex.local';

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

function supabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  return createClient(url, anon, { auth: { persistSession: false } });
}

export async function ensureDefaultBusiness() {
  const trialStartedAt = new Date();
  const trialEndsAt = new Date(trialStartedAt);
  trialEndsAt.setDate(trialEndsAt.getDate() + 14);
  const business = await db.business.upsert({
    where: { id: DEFAULT_BUSINESS_ID },
    update: {},
    create: {
      id: DEFAULT_BUSINESS_ID,
      name: 'Vernex Demo Business',
      country: 'India',
      currency: 'INR',
      taxMode: 'GST',
      ownerUserId: DEMO_AUTH_USER_ID,
      trialStartedAt,
      trialEndsAt,
      subscriptionStatus: 'TRIAL',
      planName: 'Free Trial',
    },
  });

  await db.staffProfile.upsert({
    where: { authUserId: DEMO_AUTH_USER_ID },
    update: { businessId: business.id, role: 'OWNER', status: 'ACTIVE' },
    create: {
      authUserId: DEMO_AUTH_USER_ID,
      businessId: business.id,
      name: 'Vernex Owner',
      email: DEMO_EMAIL,
      role: 'OWNER',
      status: 'ACTIVE',
    },
  });

  return business;
}

async function userFromBearer(request?: Request) {
  const authHeader = request?.headers.get('authorization') ?? '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const cookieToken = cookies().get('vernex-access-token')?.value;
  const token = bearer || cookieToken;
  const client = token ? supabase() : null;
  if (!token || !client) return null;
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

export async function getCurrentUserContext(request?: Request): Promise<CurrentUserContext> {
  const testRole = request?.headers.get('x-vernex-test-role') as UserRole | null;
  const testBusinessId = request?.headers.get('x-vernex-test-business') || DEFAULT_BUSINESS_ID;
  if (process.env.NODE_ENV !== 'production' && testRole && ['OWNER', 'MANAGER', 'CASHIER'].includes(testRole)) {
    await ensureDefaultBusiness();
    const staff = await db.staffProfile.upsert({
      where: { authUserId: `phase6-${testRole.toLowerCase()}` },
      update: { role: testRole, status: 'ACTIVE', businessId: testBusinessId },
      create: {
        authUserId: `phase6-${testRole.toLowerCase()}`,
        businessId: testBusinessId,
        name: `Phase 6 ${testRole}`,
        email: `phase6-${testRole.toLowerCase()}@vernex.local`,
        role: testRole,
        status: 'ACTIVE',
      },
    });
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
    if (!staff) throw new AuthError('No active staff profile found for this login.', 403);
    if (staff.status !== StaffStatus.ACTIVE) throw new AuthError('Staff profile is inactive.', 403);
    await db.staffProfile.update({ where: { id: staff.id }, data: { lastLoginAt: new Date() } });
    return { authUserId: user.id, staffId: staff.id, businessId: staff.businessId, name: staff.name, email: staff.email, role: staff.role };
  }

  if (process.env.NODE_ENV !== 'production') {
    await ensureDefaultBusiness();
    const staff = await db.staffProfile.findUniqueOrThrow({ where: { authUserId: DEMO_AUTH_USER_ID } });
    return { authUserId: DEMO_AUTH_USER_ID, staffId: staff.id, businessId: staff.businessId, name: staff.name, email: staff.email, role: staff.role };
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
  return null;
}
