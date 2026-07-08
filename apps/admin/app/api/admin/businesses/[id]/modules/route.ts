import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSuperAdmin } from '@/lib/auth.server';
import { createPrivilegedSupabase } from '@/lib/supabase.server';
import { MODULE_KEYS } from '@/lib/modules';
import { writeSuperAdminAudit } from '@/services/admin-audit.server';

const moduleKeySchema = z.enum(MODULE_KEYS as [typeof MODULE_KEYS[number], ...typeof MODULE_KEYS[number][]]);
const updateSchema = z.object({
  modules: z.array(z.object({ key: moduleKeySchema, enabled: z.boolean() })).length(MODULE_KEYS.length),
});

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  try {
    const { id } = await params;
    const { data, error } = await createPrivilegedSupabase()
      .from('business_modules').select('module_key,enabled').eq('business_id', id);
    if (error) throw error;
    const states = new Map((data ?? []).map((row) => [String(row.module_key), row.enabled === true]));
    return NextResponse.json({ modules: MODULE_KEYS.map((key) => ({ key, enabled: states.get(key) ?? false })) });
  } catch {
    return NextResponse.json({ error: 'Unable to load business modules.' }, { status: 503 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || new Set(parsed.data.modules.map((item) => item.key)).size !== MODULE_KEYS.length) {
    return NextResponse.json({ error: 'Submit one valid setting for every module.' }, { status: 400 });
  }
  try {
    const { id } = await params;
    const supabase = createPrivilegedSupabase();
    const { data: business } = await supabase.from('Business').select('id').eq('id', id).maybeSingle();
    if (!business) return NextResponse.json({ error: 'Business not found.' }, { status: 404 });
    const { error } = await supabase.from('business_modules').upsert(
      parsed.data.modules.map((item) => ({ business_id: id, module_key: item.key, enabled: item.enabled })),
      { onConflict: 'business_id,module_key' }
    );
    if (error) throw error;
    await writeSuperAdminAudit({
      businessId: id, action: 'BUSINESS_MODULES_UPDATED', entityType: 'BusinessModule',
      entityId: id, description: 'Updated business module availability.',
      metadata: { enabledModules: parsed.data.modules.filter((item) => item.enabled).map((item) => item.key) },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Unable to save business modules.' }, { status: 503 });
  }
}
