import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/super-admin/auth.server';
import { createPrivilegedSupabase } from '@/lib/super-admin/supabase.server';
import { importMenuRows, menuImportConfirmSchema } from '@/lib/super-admin/menu-import.server';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  const { id } = await params;
  const parsed = menuImportConfirmSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Fix validation issues before importing.' }, { status: 400 });
  try {
    const supabase = createPrivilegedSupabase();
    const { data: business, error } = await supabase.from('Business').select('id').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!business) return NextResponse.json({ error: 'Business not found.' }, { status: 404 });
    const result = await importMenuRows(id, parsed.data);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to import this menu.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
