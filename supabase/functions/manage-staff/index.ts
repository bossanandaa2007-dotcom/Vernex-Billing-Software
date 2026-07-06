import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (request) => {
  if (request.method !== 'POST') return Response.json({ error: 'Method not allowed.' }, { status: 405 });
  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return Response.json({ error: 'Unauthenticated.' }, { status: 401 });
  const url = Deno.env.get('SUPABASE_URL')!;
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const { data: userData } = await admin.auth.getUser(token);
  if (!userData.user) return Response.json({ error: 'Unauthenticated.' }, { status: 401 });
  const { data: actor } = await admin.from('StaffProfile').select('businessId,role,status')
    .eq('authUserId', userData.user.id).maybeSingle();
  if (!actor || actor.status !== 'ACTIVE' || actor.role !== 'OWNER') {
    return Response.json({ error: 'You do not have permission for this action.' }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  if (body.action !== 'create' || body.businessId !== actor.businessId) {
    return Response.json({ error: 'Unsupported action.' }, { status: 400 });
  }
  const email = String(body.email ?? '').trim().toLowerCase();
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { business_id: actor.businessId, role: body.role },
  });
  if (inviteError || !invited.user) {
    return Response.json({ error: 'Unable to create staff account.' }, { status: 400 });
  }
  const { data: staff, error } = await admin.from('StaffProfile').insert({
    authUserId: invited.user.id,
    businessId: actor.businessId,
    name: body.name,
    email,
    phone: body.phone || null,
    role: body.role,
    status: 'ACTIVE',
  }).select('*').single();
  if (error) {
    await admin.auth.admin.deleteUser(invited.user.id);
    return Response.json({ error: 'Unable to create staff account.' }, { status: 400 });
  }
  return Response.json(staff, { status: 201 });
});
