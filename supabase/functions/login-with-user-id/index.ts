import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return Response.json({ error: 'Method not allowed.' }, { status: 405 });

  try {
    const { userId, password } = await request.json();
    if (typeof userId !== 'string' || typeof password !== 'string') {
      return Response.json({ error: 'Invalid User ID or password.' }, { status: 401, headers: corsHeaders });
    }

    const url = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data: staff } = await admin
      .from('StaffProfile')
      .select('email, status')
      .eq('userId', userId.trim().toLowerCase())
      .maybeSingle();

    if (!staff || staff.status !== 'ACTIVE') {
      return Response.json({ error: 'Invalid User ID or password.' }, { status: 401, headers: corsHeaders });
    }

    const auth = createClient(url, anonKey, { auth: { persistSession: false } });
    const { data, error } = await auth.auth.signInWithPassword({ email: staff.email, password });
    if (error || !data.session) {
      return Response.json({ error: 'Invalid User ID or password.' }, { status: 401, headers: corsHeaders });
    }

    return Response.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in: data.session.expires_in,
      token_type: data.session.token_type,
    }, { headers: { ...corsHeaders, 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: 'Invalid User ID or password.' }, { status: 401, headers: corsHeaders });
  }
});
