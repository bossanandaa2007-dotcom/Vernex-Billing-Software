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
import { requestUsesHttps, sessionCookieName } from '@/lib/session-cookie';
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

export async function middleware(request: NextRequest) {
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
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('message', 'session-expired');
    const response = request.nextUrl.pathname.startsWith('/api/')
      ? NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 })
      : NextResponse.redirect(url);
    response.cookies.delete(sessionCookieName);
    return response;
  }
}

export const config = {
  matcher: [
    '/home/:path*', '/orders/:path*', '/product/:path*', '/customers/:path*',
    '/customer/:path*', '/records/:path*', '/inventory/:path*', '/analytics/:path*',
    '/staff/:path*', '/audit-logs/:path*', '/settings/:path*', '/api/:path*',
  ],
};
