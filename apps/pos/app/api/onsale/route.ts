import { onsaleSchema } from '@/schema';
import { NextResponse } from 'next/server';
import { authErrorResponse, getAuthSource, requirePermission } from '@/lib/auth';
import { safeOperationMessage } from '@/lib/api-error';
import { requireActiveSubscription } from '@/lib/subscription';
import { createServerClient } from '@/src/lib/supabase/server';

const profileHeader = 'x-vernex-profile';

function nowMs() {
  return performance.now();
}

function elapsed(start: number, end: number) {
  return Math.max(0, end - start);
}

function readMiddlewareProfile(request: Request) {
  const value = request.headers.get(profileHeader);
  if (!value) return {};
  try {
    return JSON.parse(decodeURIComponent(value)) as Record<string, number | string | boolean>;
  } catch {
    return {};
  }
}

function duration(profile: Record<string, number | string | boolean>, start: string, end: string) {
  const started = Number(profile[start]);
  const ended = Number(profile[end]);
  return Number.isFinite(started) && Number.isFinite(ended) ? Math.max(0, ended - started) : 0;
}

function logProfile(
  middlewareProfile: Record<string, number | string | boolean>,
  routeProfile: Record<string, number | string | boolean>,
  status: number
) {
  const middlewareStart = Number(middlewareProfile.middlewareStart) || Number(routeProfile.routeStart);
  const middlewareEnd = Number(middlewareProfile.middlewareEnd) || middlewareStart;
  const routeStart = Number(routeProfile.routeStart);
  const routeEnd = Number(routeProfile.routeEnd);
  const middlewareAuth =
    duration(middlewareProfile, 'authUserFetchStart', 'authUserFetchEnd') +
    duration(middlewareProfile, 'authUserJsonStart', 'authUserJsonEnd') +
    duration(middlewareProfile, 'profileFetchStart', 'profileFetchEnd') +
    duration(middlewareProfile, 'profileJsonStart', 'profileJsonEnd') +
    duration(middlewareProfile, 'modulesFetchStart', 'modulesFetchEnd') +
    duration(middlewareProfile, 'modulesJsonStart', 'modulesJsonEnd');
  const table = {
    traceId: String(routeProfile.traceId ?? ''),
    status,
    totalInstrumentedMs: routeEnd - middlewareStart,
    middlewareMs: middlewareEnd - middlewareStart,
    middlewareAuthMs: middlewareAuth,
    middlewareCacheHit: Boolean(middlewareProfile.middlewareCacheHit),
    middlewareModuleCheckMs: duration(middlewareProfile, 'middlewareModuleCheckStart', 'middlewareModuleCheckEnd'),
    frameworkToRouteMs: Math.max(0, routeStart - middlewareEnd),
    routeRuntimeMs: routeEnd - routeStart,
    authMs: duration(routeProfile, 'authStart', 'authEnd'),
    authSource: String(routeProfile.authSource ?? 'unknown'),
    featureSubscriptionMs: duration(routeProfile, 'subscriptionStart', 'subscriptionEnd'),
    jsonParseMs: duration(routeProfile, 'jsonParseStart', 'jsonParseEnd'),
    requestValidationMs: duration(routeProfile, 'validationStart', 'validationEnd'),
    supabaseClientMs: duration(routeProfile, 'supabaseClientStart', 'supabaseClientEnd'),
    rpcNetworkMs: duration(routeProfile, 'rpcStart', 'rpcEnd'),
    responseSerializationMs: duration(routeProfile, 'responseStart', 'responseEnd'),
    routeHighResMs: Number(routeProfile.routeHighResMs ?? 0),
    responseHeadersMs: Number(routeProfile.responseHeadersMs ?? 0),
    responseObjectCreateMs: Number(routeProfile.responseObjectCreateMs ?? 0),
    routeReturnReadyMs: Number(routeProfile.routeReturnReadyMs ?? 0),
    measuredUntil: 'route-return-ready',
  };
  console.log(`PERF_ONSALE ${JSON.stringify(table)}`);
}

function attachProfileHeaders(
  response: NextResponse,
  routeProfile: Record<string, number | string | boolean>,
  status: number
) {
  const headerStart = nowMs();
  const routeMs = Number(routeProfile.routeHighResMs ?? routeProfile.routeReturnReadyMs ?? 0);
  const rpcMs = duration(routeProfile, 'rpcStart', 'rpcEnd');
  response.headers.set('x-vernex-trace-id', String(routeProfile.traceId ?? ''));
  response.headers.set('x-vernex-route-ms', routeMs.toFixed(2));
  response.headers.set('x-vernex-rpc-ms', rpcMs.toFixed(2));
  response.headers.set('x-vernex-status', String(status));
  response.headers.set(
    'server-timing',
    [
      `route;dur=${routeMs.toFixed(2)}`,
      `auth;dur=${duration(routeProfile, 'authStart', 'authEnd').toFixed(2)}`,
      `subscription;dur=${duration(routeProfile, 'subscriptionStart', 'subscriptionEnd').toFixed(2)}`,
      `json;dur=${duration(routeProfile, 'jsonParseStart', 'jsonParseEnd').toFixed(2)}`,
      `validation;dur=${duration(routeProfile, 'validationStart', 'validationEnd').toFixed(2)}`,
      `supabaseClient;dur=${duration(routeProfile, 'supabaseClientStart', 'supabaseClientEnd').toFixed(2)}`,
      `rpc;dur=${rpcMs.toFixed(2)}`,
      `response;dur=${duration(routeProfile, 'responseStart', 'responseEnd').toFixed(2)}`,
    ].join(', ')
  );
  routeProfile.responseHeadersMs = elapsed(headerStart, nowMs());
}

export async function POST(request: Request) {
  const middlewareProfile = readMiddlewareProfile(request);
  const routeHighResStart = nowMs();
  const routeProfile: Record<string, number | string | boolean> = {
    traceId: crypto.randomUUID(),
    routeStart: Date.now(),
  };
  let ctx;
  try {
    routeProfile.authStart = Date.now();
    ctx = await requirePermission(request, 'POS_BILLING');
    routeProfile.authEnd = Date.now();
    routeProfile.authSource = getAuthSource(request);
    routeProfile.subscriptionStart = Date.now();
    await requireActiveSubscription(ctx);
    routeProfile.subscriptionEnd = Date.now();
  } catch (error) {
    const response = authErrorResponse(error);
    if (response) {
      routeProfile.responseStart = Date.now();
      routeProfile.responseEnd = Date.now();
      routeProfile.routeEnd = Date.now();
      routeProfile.routeHighResMs = elapsed(routeHighResStart, nowMs());
      attachProfileHeaders(response, routeProfile, response.status);
      routeProfile.routeReturnReadyMs = elapsed(routeHighResStart, nowMs());
      logProfile(middlewareProfile, routeProfile, response.status);
      return response;
    }
    throw error;
  }

  routeProfile.jsonParseStart = Date.now();
  const body = await request.json();
  routeProfile.jsonParseEnd = Date.now();
  routeProfile.validationStart = Date.now();
  const parsed = onsaleSchema.safeParse(body);
  routeProfile.validationEnd = Date.now();
  if (!parsed.success) {
    routeProfile.responseStart = Date.now();
    const responseObjectStart = nowMs();
    const response = NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    routeProfile.responseObjectCreateMs = elapsed(responseObjectStart, nowMs());
    routeProfile.responseEnd = Date.now();
    routeProfile.routeEnd = Date.now();
    routeProfile.routeHighResMs = elapsed(routeHighResStart, nowMs());
    attachProfileHeaders(response, routeProfile, response.status);
    routeProfile.routeReturnReadyMs = elapsed(routeHighResStart, nowMs());
    logProfile(middlewareProfile, routeProfile, response.status);
    return response;
  }

  const { productId, transactionId, qTy } = parsed.data;
  try {
    routeProfile.supabaseClientStart = Date.now();
    const supabase = await createServerClient(request);
    routeProfile.supabaseClientEnd = Date.now();
    routeProfile.rpcStart = Date.now();
    const { data: line, error } = await supabase.rpc('add_product_to_bill', {
      p_transaction_id: transactionId,
      p_product_id: productId,
      p_quantity: qTy,
    });
    routeProfile.rpcEnd = Date.now();
    if (error) throw error;

    routeProfile.responseStart = Date.now();
    const responseObjectStart = nowMs();
    const response = NextResponse.json(line, { status: 201 });
    routeProfile.responseObjectCreateMs = elapsed(responseObjectStart, nowMs());
    routeProfile.responseEnd = Date.now();
    routeProfile.routeEnd = Date.now();
    routeProfile.routeHighResMs = elapsed(routeHighResStart, nowMs());
    attachProfileHeaders(response, routeProfile, response.status);
    routeProfile.routeReturnReadyMs = elapsed(routeHighResStart, nowMs());
    logProfile(middlewareProfile, routeProfile, response.status);
    return response;
  } catch (error) {
    const message = safeOperationMessage(
      error,
      [
        'Bill is missing or already completed.',
        'Product is not sellable.',
        'Only ',
        'Qty must be a positive number.',
      ],
      'Unable to add product to bill.'
    );
    const status = message.includes('Product is not sellable') ? 404
      : message.includes('Unable to add') ? 500
        : 409;
    routeProfile.responseStart = Date.now();
    const responseObjectStart = nowMs();
    const response = NextResponse.json({ error: message }, { status });
    routeProfile.responseObjectCreateMs = elapsed(responseObjectStart, nowMs());
    routeProfile.responseEnd = Date.now();
    routeProfile.routeEnd = Date.now();
    routeProfile.routeHighResMs = elapsed(routeHighResStart, nowMs());
    attachProfileHeaders(response, routeProfile, response.status);
    routeProfile.routeReturnReadyMs = elapsed(routeHighResStart, nowMs());
    logProfile(middlewareProfile, routeProfile, response.status);
    return response;
  }
}
