import { NextResponse, type NextRequest } from 'next/server';
import { sessionCookieName } from '@/lib/session-cookie';
import type { ModuleKey } from '@/lib/modules';

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
  const module = [...pageModules, ...apiModules].find(([prefix]) => matches(pathname, prefix))?.[1];
  return module ? [module] : [];
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

export async function middleware(request: NextRequest) {
  const moduleKeys = requiredModules(request);
  if (!moduleKeys.length) return noStore(NextResponse.next());

  const token = request.cookies.get(sessionCookieName)?.value;
  if (!token) {
    if (request.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  const config = configuration();
  if (!config) return NextResponse.json({ error: 'Authentication is not configured.' }, { status: 503 });
  const headers = { apikey: config.anonKey, Authorization: `Bearer ${token}` };

  try {
    const verification = await fetch(`${config.url}/auth/v1/user`, { headers, cache: 'no-store' });
    if (!verification.ok) throw new Error('invalid-session');
    const user = await verification.json() as { id?: string };
    if (!user.id) throw new Error('invalid-session');

    const profileResponse = await fetch(
      `${config.url}/rest/v1/StaffProfile?select=businessId&authUserId=eq.${encodeURIComponent(user.id)}&limit=1`,
      { headers, cache: 'no-store' }
    );
    if (!profileResponse.ok) throw new Error('profile-unavailable');
    const profiles = await profileResponse.json() as Array<{ businessId: string }>;
    if (!profiles[0]?.businessId) throw new Error('profile-unavailable');

    const moduleResponse = await fetch(
      `${config.url}/rest/v1/business_modules?select=module_key,enabled&business_id=eq.${encodeURIComponent(profiles[0].businessId)}&module_key=in.(${moduleKeys.join(',')})`,
      { headers, cache: 'no-store' }
    );
    if (!moduleResponse.ok) throw new Error('modules-unavailable');
    const modules = await moduleResponse.json() as Array<{ module_key: string; enabled: boolean }>;
    const enabled = new Set(modules.filter((item) => item.enabled).map((item) => item.module_key));
    return moduleKeys.every((key) => enabled.has(key)) ? noStore(NextResponse.next()) : unavailable(request);
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
