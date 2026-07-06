import { NextResponse } from 'next/server';
import { hasPermission, isRoleAllowed, type Permission } from '@/lib/permissions';
import { createServerClient } from '@/src/lib/supabase/server';
import type { StaffStatus, UserRole } from '@/src/types/domain';

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

export async function getCurrentUserContext(request?: Request): Promise<CurrentUserContext> {
  const supabase = await createServerClient(request);
  const authorization = request?.headers.get('authorization');
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;
  const { data: userData, error: userError } = token
    ? await supabase.auth.getUser(token)
    : await supabase.auth.getUser();

  if (userError || !userData.user) throw new AuthError('Unauthenticated.', 401);

  const { data: staff, error } = await supabase
    .from('StaffProfile')
    .select('id, authUserId, businessId, name, email, role, status')
    .eq('authUserId', userData.user.id)
    .maybeSingle();

  if (error) throw new AuthError('Unable to load your account. Please try again.', 503);
  if (!staff) throw new AuthError('You do not have permission to access this workspace.', 403);
  if ((staff.status as StaffStatus) !== 'ACTIVE') {
    throw new AuthError('Your account is inactive. Contact the business owner.', 403);
  }

  await supabase
    .from('StaffProfile')
    .update({ lastLoginAt: new Date().toISOString() })
    .eq('id', staff.id);

  return {
    authUserId: userData.user.id,
    staffId: staff.id,
    businessId: staff.businessId,
    name: staff.name,
    email: staff.email,
    role: staff.role as UserRole,
  };
}

export const requireAuth = getCurrentUserContext;

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
