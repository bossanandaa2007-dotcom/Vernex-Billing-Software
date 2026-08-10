import { NextResponse, type NextRequest } from 'next/server';
import {
  encodeRequestContext,
  encodeRequestContextCookieValue,
  REQUEST_CONTEXT_COOKIE_MAX_AGE,
  requestContextCookieName,
  requestContextHeader,
  requestContextSignatureHeader,
  stripRequestContextHeaders,
} from '@/lib/request-context';
import { clearSessionCookie, refreshCookieName, requestUsesHttps, sessionCookieName, setSessionCookies } from '@/lib/session-cookie';
import type { CurrentUserContext } from '@/lib/auth';
import type { ModuleKey } from '@/lib/modules';

const profileHeader = 'x-vernex-profile';

const pageModules: Array<[string, ModuleKey]> = [
  ['/home', 'dashboard'],
  ['/orders', 'pos_billing'],
  ['/product', 'products'],
  ['/customers', 'customers'],
  ['/customer', 'customers'],
  ['/records', 'sales_records'],
  ['/inventory', 'inventory_ledger'],
  ['/analytics', 'reports'],
  ['/staff', 'staff_management'],
  ['/audit-logs', 'audit_logs'],
  ['/settings', 'business_settings'],
  ['/support', 'support'],
];

const apiModules: Array<[string, ModuleKey]> = [
  ['/api/dashboard', 'dashboard'],
  ['/api/product', 'products'],
  ['/api/storage', 'pos_billing'],
  ['/api/favorite', 'products'],
  ['/api/customers', 'customers'],
  ['/api/transactions', 'sales_records'],
  ['/api/reports', 'reports'],
  ['/api/profit', 'reports'],
  ['/api/inventory-ledger', 'inventory_ledger'],
  ['/api/restock', 'inventory'],
  ['/api/staff', 'staff_management'],
  ['/api/audit-logs', 'audit_logs'],
  ['/api/returns', 'returns_refunds'],
  ['/api/onsale', 'pos_billing'],
  ['/api/productsale', 'pos_billing'],
  ['/api/support', 'support'],
];

function matches(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function requiredModules(request: NextRequest): ModuleKey[] {
  const { pathname } = request.nextUrl;
  if (matches(pathname, '/api/shopdata') && request.method !== 'GET') return ['business_settings'];
  if (matches(pathname, '/api/inventory-ledger') && request.method !== 'GET') return ['inventory_ledger', 'stock_adjustment'];
  if (matches(pathname, '/api/transactions')) return [request.method === 'POST' ? 'pos_billing' : 'sales_records'];
  if (matches(pathname, '/api/reports')) {
    const type = pathname.split('/')[3] || request.nextUrl.searchParams.get('type');
    const detailModules: Partial<Record<string, ModuleKey>> = {
      customers: 'customers', products: 'products', returns: 'returns_refunds',
      payments: 'finance', staff: 'staff_management', inventory: 'inventory',
    };
    return detailModules[type ?? ''] ? ['reports', detailModules[type ?? '']!] : ['reports'];
  }
  const requiredModule = [...pageModules, ...apiModules].find(([prefix]) => matches(pathname, prefix))?.[1];
  return requiredModule ? [requiredModule] : [];
}

function requiresAuthenticatedContext(pathname: string) {
  return [
    '/api/app-context',
    '/api/auth/context',
    '/api/shopdata',
    '/api/subscription',
    '/api/storage',
  ].some((prefix) => matches(pathname, prefix));
}

function configuration() {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.DATABASE_ANON_KEY;
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url && process.env.DATABASE_URL) {
    try {
      const username = new URL(process.env.DATABASE_URL).username;
      if (username.startsWith('postgres.')) url = `https://${username.slice(9)}.supabase.co`;
    } catch {}
  }
  return url && anonKey ? { url, anonKey } : null;
}

// Short-lived guard cookie that prevents an endless refresh->redirect loop if a
// freshly refreshed token somehow still fails to authenticate.
const refreshGuardCookie = 'vernex-rt-guard';

// Exchange the refresh token for a new Supabase session.
async function refreshAccess(config: { url: string; anonKey: string }, refreshToken: string) {
  try {
    const response = await fetch(`${config.url}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: config.anonKey, Authorization: `Bearer ${config.anonKey}` },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: 'no-store',
    });
    if (!response.ok) return null;
    return (await response.json()) as { access_token?: string; refresh_token?: string };
  } catch {
    return null;
  }
}

// When the access token is missing/expired, use the refresh-token cookie to mint
// a fresh session, set the new cookies, and redirect back to the same URL so the
// request re-runs with a valid token. Returns null if refresh is unavailable.
async function attemptRefreshRedirect(request: NextRequest) {
  if (request.cookies.get(refreshGuardCookie)?.value) return null;
  const refreshToken = request.cookies.get(refreshCookieName)?.value;
  const config = configuration();
  if (!refreshToken || !config) return null;
  const session = await refreshAccess(config, refreshToken);
  if (!session?.access_token) return null;
  const secure = requestUsesHttps(request);
  const response = noStore(NextResponse.redirect(request.url));
  setSessionCookies(response, { accessToken: session.access_token, refreshToken: session.refresh_token }, secure);
  response.cookies.set(refreshGuardCookie, '1', { httpOnly: true, sameSite: 'lax', secure, path: '/', maxAge: 20 });
  return response;
}

function unavailable(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'This feature is not enabled for your business.' }, { status: 403 });
  }
  return new NextResponse('This feature is not enabled for your business.', {
    status: 403,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

// Tenant data and pages must never be reused from a browser/proxy cache after a
// different business logs in on the same device. Force revalidation everywhere.
function noStore(response: NextResponse) {
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  return response;
}

// Short-lived per-token access cache. Without it every page/API request pays
// three sequential Supabase round-trips (user -> profile -> modules) before the
// route even runs. Entries expire quickly so deactivations and module changes
// still take effect within a minute.
type AccessEntry = { ctx: CurrentUserContext; enabled: Set<string>; expires: number };
const accessCache = new Map<string, AccessEntry>();
const ACCESS_CACHE_MS = 60_000;
const ACCESS_CACHE_MAX = 500;

function getCachedAccess(token: string) {
  const entry = accessCache.get(token);
  if (entry && entry.expires > Date.now()) return entry;
  if (entry) accessCache.delete(token);
  return null;
}

function setCachedAccess(token: string, entry: AccessEntry) {
  if (accessCache.size >= ACCESS_CACHE_MAX) accessCache.clear();
  accessCache.set(token, entry);
}

function shouldProfileOnsale(request: NextRequest) {
  return request.method === 'POST' && request.nextUrl.pathname === '/api/onsale';
}

function shouldBypassMiddleware(request: NextRequest) {
  // The /api/onsale route performs its own auth, module, and subscription checks.
  // Letting it go straight to the Node route avoids the Edge middleware -> route
  // handoff cost without changing the business decision made for the request.
  return request.method === 'POST' && request.nextUrl.pathname === '/api/onsale';
}

function setProfile(headers: Headers, profile?: Record<string, number | string | boolean>) {
  headers.delete(profileHeader);
  if (profile) headers.set(profileHeader, encodeURIComponent(JSON.stringify(profile)));
}

async function nextWithContext(request: NextRequest, token: string, ctx: CurrentUserContext, profile?: Record<string, number | string | boolean>) {
  const headers = new Headers(request.headers);
  stripRequestContextHeaders(headers);
  const encoded = await encodeRequestContext(ctx, token);
  if (encoded) {
    headers.set(requestContextHeader, encoded.payload);
    headers.set(requestContextSignatureHeader, encoded.signature);
  }
  setProfile(headers, profile);
  const response = noStore(NextResponse.next({ request: { headers } }));
  if (encoded) {
    response.cookies.set(requestContextCookieName, encodeRequestContextCookieValue(encoded), {
      httpOnly: true,
      sameSite: 'lax',
      secure: requestUsesHttps(request),
      path: '/',
      maxAge: REQUEST_CONTEXT_COOKIE_MAX_AGE,
    });
  }
  return response;
}

// The merged Super Admin section shares the POS session cookie but is gated on
// the platform Super Admin identity (email match), not on a StaffProfile. Any
// other user — even a valid business login — is blocked here.
async function handleSuperAdmin(request: NextRequest) {
  const isApi = request.nextUrl.pathname.startsWith('/api/');
  const deny = () => {
    if (isApi) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', request.nextUrl.pathname);
    return noStore(NextResponse.redirect(url));
  };
  const token = request.cookies.get(sessionCookieName)?.value;
  const allowed = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const config = configuration();
  if (!allowed || !config) return deny();
  // Missing token: try to renew from the refresh cookie before denying.
  if (!token) return (await attemptRefreshRedirect(request)) ?? deny();
  try {
    const verification = await fetch(`${config.url}/auth/v1/user`, {
      headers: { apikey: config.anonKey, Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (verification.ok) {
      const user = (await verification.json()) as { email?: string };
      // Wrong account (not the super admin): a refresh cannot help — deny outright.
      return user.email?.toLowerCase() === allowed ? noStore(NextResponse.next()) : deny();
    }
  } catch {}
  // Token expired/invalid: attempt a silent refresh, otherwise deny.
  return (await attemptRefreshRedirect(request)) ?? deny();
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === '/super-admin' || pathname.startsWith('/super-admin/') || pathname.startsWith('/api/super-admin')) {
    return handleSuperAdmin(request);
  }

  if (shouldBypassMiddleware(request)) {
    const headers = new Headers(request.headers);
    stripRequestContextHeaders(headers);
    setProfile(headers);
    return noStore(NextResponse.next({ request: { headers } }));
  }

  const profiling = shouldProfileOnsale(request);
  const profile: Record<string, number | string | boolean> | undefined = profiling
    ? { middlewareStart: Date.now(), middlewareCacheHit: false }
    : undefined;
  const moduleKeys = requiredModules(request);
  const needsAuth = moduleKeys.length > 0 || requiresAuthenticatedContext(request.nextUrl.pathname);
  if (!needsAuth) {
    const headers = new Headers(request.headers);
    stripRequestContextHeaders(headers);
    setProfile(headers);
    return noStore(NextResponse.next({ request: { headers } }));
  }

  if (profile) profile.tokenReadStart = Date.now();
  const token = request.cookies.get(sessionCookieName)?.value;
  if (profile) profile.tokenReadEnd = Date.now();
  if (!token) {
    const refreshed = await attemptRefreshRedirect(request);
    if (refreshed) return refreshed;
    if (request.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (profile) profile.middlewareCacheLookupStart = Date.now();
  const cached = getCachedAccess(token);
  if (profile) profile.middlewareCacheLookupEnd = Date.now();
  if (cached) {
    if (profile) profile.middlewareCacheHit = true;
    if (profile) profile.middlewareModuleCheckStart = Date.now();
    const allowed = moduleKeys.every((key) => cached.enabled.has(key));
    if (profile) profile.middlewareModuleCheckEnd = Date.now();
    return moduleKeys.every((key) => cached.enabled.has(key))
      ? nextWithContext(request, token, cached.ctx, { ...profile, middlewareEnd: Date.now() })
      : unavailable(request);
  }

  if (profile) profile.configStart = Date.now();
  const config = configuration();
  if (profile) profile.configEnd = Date.now();
  if (!config) return NextResponse.json({ error: 'Authentication is not configured.' }, { status: 503 });
  const headers = { apikey: config.anonKey, Authorization: `Bearer ${token}` };

  try {
    if (profile) profile.authUserFetchStart = Date.now();
    const verification = await fetch(`${config.url}/auth/v1/user`, { headers, cache: 'no-store' });
    if (profile) profile.authUserFetchEnd = Date.now();
    if (!verification.ok) throw new Error('invalid-session');
    if (profile) profile.authUserJsonStart = Date.now();
    const user = await verification.json() as { id?: string };
    if (profile) profile.authUserJsonEnd = Date.now();
    if (!user.id) throw new Error('invalid-session');

    if (profile) profile.profileFetchStart = Date.now();
    const profileResponse = await fetch(
      `${config.url}/rest/v1/StaffProfile?select=id,authUserId,businessId,name,email,role,status&authUserId=eq.${encodeURIComponent(user.id)}&limit=1`,
      { headers, cache: 'no-store' }
    );
    if (profile) profile.profileFetchEnd = Date.now();
    if (!profileResponse.ok) throw new Error('profile-unavailable');
    if (profile) profile.profileJsonStart = Date.now();
    const profiles = await profileResponse.json() as Array<Omit<CurrentUserContext, 'staffId' | 'enabledModules'> & { id: string; status: string }>;
    if (profile) profile.profileJsonEnd = Date.now();
    const staffProfile = profiles[0];
    if (!staffProfile?.businessId || staffProfile.status !== 'ACTIVE') throw new Error('profile-unavailable');

    // Fetch the business's full module map once and cache it, so every route
    // decision for this session is answered locally for the next minute.
    if (profile) profile.modulesFetchStart = Date.now();
    const moduleResponse = await fetch(
      `${config.url}/rest/v1/business_modules?select=module_key,enabled&business_id=eq.${encodeURIComponent(staffProfile.businessId)}`,
      { headers, cache: 'no-store' }
    );
    if (profile) profile.modulesFetchEnd = Date.now();
    if (!moduleResponse.ok) throw new Error('modules-unavailable');
    if (profile) profile.modulesJsonStart = Date.now();
    const modules = await moduleResponse.json() as Array<{ module_key: string; enabled: boolean }>;
    if (profile) profile.modulesJsonEnd = Date.now();
    const enabledModules = modules.filter((item) => item.enabled).map((item) => item.module_key);
    const enabled = new Set(enabledModules);
    const ctx: CurrentUserContext = {
      authUserId: staffProfile.authUserId,
      staffId: staffProfile.id,
      businessId: staffProfile.businessId,
      name: staffProfile.name,
      email: staffProfile.email,
      role: staffProfile.role as CurrentUserContext['role'],
      enabledModules,
    };
    if (profile) profile.middlewareModuleCheckStart = Date.now();
    const allowed = moduleKeys.every((key) => enabled.has(key));
    if (profile) profile.middlewareModuleCheckEnd = Date.now();
    setCachedAccess(token, { ctx, enabled, expires: Date.now() + ACCESS_CACHE_MS });
    return allowed ? nextWithContext(request, token, ctx, { ...profile, middlewareEnd: Date.now() }) : unavailable(request);
  } catch (error) {
    if (error instanceof Error && error.message !== 'invalid-session') {
      return NextResponse.json({ error: 'Unable to verify business feature access.' }, { status: 503 });
    }
    // The access token expired: try to silently renew it from the refresh cookie
    // before forcing a fresh login. This is what keeps the user signed in.
    const refreshed = await attemptRefreshRedirect(request);
    if (refreshed) return refreshed;
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('message', 'session-expired');
    const response = request.nextUrl.pathname.startsWith('/api/')
      ? NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 })
      : NextResponse.redirect(url);
    clearSessionCookie(response, requestUsesHttps(request));
    return response;
  }
}

export const config = {
  matcher: [
    '/home/:path*', '/orders/:path*', '/product/:path*', '/customers/:path*',
    '/customer/:path*', '/records/:path*', '/inventory/:path*', '/analytics/:path*',
    '/staff/:path*', '/audit-logs/:path*', '/settings/:path*', '/support/:path*',
    '/super-admin/:path*', '/api/:path*',
  ],
};
