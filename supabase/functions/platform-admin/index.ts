import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (request) => {
  if (request.method !== 'POST') return Response.json({ error: 'Method not allowed.' }, { status: 405 });
  const body = await request.json().catch(() => ({}));
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  );

  if (body.action === 'setup-status') {
    const { count } = await admin.from('Business').select('id', { count: 'exact', head: true });
    return Response.json({ available: (count ?? 0) === 0 });
  }

  if (body.action === 'activate') {
    if (!body.secret || body.secret !== Deno.env.get('VERNEX_ADMIN_SECRET')) {
      return Response.json({ error: 'Admin activation is not authorized.' }, { status: 403 });
    }
    const { data: existing } = await admin.from('Business').select('*').eq('id', body.businessId).maybeSingle();
    if (!existing) return Response.json({ error: 'Business account not found.' }, { status: 404 });
    if (existing.subscriptionStatus === 'ACTIVE') {
      return Response.json({ activation: existing, alreadyActive: true });
    }
    const { data, error } = await admin.from('Business').update({
      subscriptionStatus: 'ACTIVE',
      planName: body.planName,
      activatedAt: new Date().toISOString(),
      suspendedAt: null,
    }).eq('id', body.businessId).select('*').single();
    if (error) return Response.json({ error: 'Unable to activate this business.' }, { status: 400 });
    return Response.json({ activation: data, alreadyActive: false });
  }

  return Response.json({ error: 'Unsupported action.' }, { status: 400 });
});
