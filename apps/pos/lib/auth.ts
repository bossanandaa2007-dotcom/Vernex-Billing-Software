import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { hasPermission, isRoleAllowed, type Permission } from '@/lib/permissions';
import { getModuleForPermission, hasModule } from '@/lib/modules';
import { decodeRequestContext, decodeRequestContextCookie, requestContextCookieName } from '@/lib/request-context';
import { sessionCookieName } from '@/lib/session-cookie';
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
  enabledModules: string[];
};

// Short-lived per-token context cache. Auth resolution costs three sequential
// Supabase round-trips; most page loads fire several API calls in a burst, so
// caching for a few seconds removes nearly all of that latency. Deactivated
// accounts and module changes still apply within CONTEXT_CACHE_MS.
const contextCache = new Map<string, { ctx: CurrentUserContext; expires: number }>();
const CONTEXT_CACHE_MS = 30_000;
const CONTEXT_CACHE_MAX = 500;
const authSourceByRequest = new WeakMap<Request, string>();

function rememberAuthSource(request: Request | undefined, source: string) {
  if (request) authSourceByRequest.set(request, source);
}

export function getAuthSource(request: Request | undefined) {
  return request ? authSourceByRequest.get(request) ?? 'unknown' : 'unknown';
}

async function resolveSessionToken(request?: Request) {
  const authorization = request?.headers.get('authorization');
  if (authorization?.startsWith('Bearer ')) return authorization.slice(7);
  try {
    return (await cookies()).get(sessionCookieName)?.value;
  } catch {
    return undefined;
  }
}

export async function getCurrentUserContext(request?: Request): Promise<CurrentUserContext> {
  const cacheToken = await resolveSessionToken(request);
  if (cacheToken) {
    let requestHeaders: Headers | null = request?.headers ?? null;
    if (!requestHeaders) {
      try {
        requestHeaders = await headers();
      } catch {
        requestHeaders = null;
      }
    }
    const headerContext = requestHeaders ? await decodeRequestContext(requestHeaders, cacheToken) : null;
    if (headerContext) {
      if (contextCache.size >= CONTEXT_CACHE_MAX) contextCache.clear();
      contextCache.set(cacheToken, { ctx: headerContext, expires: Date.now() + CONTEXT_CACHE_MS });
      rememberAuthSource(request, 'signed-header');
      return headerContext;
    }

    try {
      const cookieContext = await decodeRequestContextCookie((await cookies()).get(requestContextCookieName)?.value, cacheToken);
      if (cookieContext) {
        if (contextCache.size >= CONTEXT_CACHE_MAX) contextCache.clear();
        contextCache.set(cacheToken, { ctx: cookieContext, expires: Date.now() + CONTEXT_CACHE_MS });
        rememberAuthSource(request, 'signed-cookie');
        return cookieContext;
      }
    } catch {}
  }

  if (cacheToken) {
    const cached = contextCache.get(cacheToken);
    if (cached && cached.expires > Date.now()) {
      rememberAuthSource(request, 'memory-cache');
      return cached.ctx;
    }
    if (cached) contextCache.delete(cacheToken);
  }

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
  const { data: moduleRows, error: moduleError } = await supabase
    .from('business_modules')
    .select('module_key')
    .eq('business_id', staff.businessId)
    .eq('enabled', true);
  if (moduleError) throw new AuthError('Unable to load your business features. Please try again.', 503);

  // Best-effort activity timestamp; never block the request on this write.
  void supabase
    .from('StaffProfile')
    .update({ lastLoginAt: new Date().toISOString() })
    .eq('id', staff.id)
    .then(() => undefined, () => undefined);

  const ctx: CurrentUserContext = {
    authUserId: userData.user.id,
    staffId: staff.id,
    businessId: staff.businessId,
    name: staff.name,
    email: staff.email,
    role: staff.role as UserRole,
    enabledModules: (moduleRows ?? []).map((row) => String(row.module_key)),
  };
  if (cacheToken) {
    if (contextCache.size >= CONTEXT_CACHE_MAX) contextCache.clear();
    contextCache.set(cacheToken, { ctx, expires: Date.now() + CONTEXT_CACHE_MS });
  }
  rememberAuthSource(request, 'supabase-cold');
  return ctx;
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
  const moduleKey = getModuleForPermission(permission as keyof typeof import('@/lib/modules').MODULE_PERMISSION_MAP);
  if (moduleKey && !hasModule(ctx.enabledModules, moduleKey)) {
    throw new AuthError('This feature is not enabled for your business.', 403);
  }
  return ctx;
}

export function authErrorResponse(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return null;
}
