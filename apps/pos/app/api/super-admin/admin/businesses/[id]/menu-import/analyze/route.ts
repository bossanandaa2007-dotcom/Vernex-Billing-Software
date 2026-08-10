import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/super-admin/auth.server';
import { createPrivilegedSupabase } from '@/lib/super-admin/supabase.server';
import { enrichRowsWithTenantContext, extractMenuRows } from '@/lib/super-admin/menu-import.server';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  const { id } = await params;
  try {
    const supabase = createPrivilegedSupabase();
    const { data: business, error } = await supabase.from('Business').select('id,name').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!business) return NextResponse.json({ error: 'Business not found.' }, { status: 404 });

    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) return NextResponse.json({ error: 'Upload a menu file.' }, { status: 400 });

    const extracted = await extractMenuRows(file);
    const rows = await enrichRowsWithTenantContext(id, extracted.rows);
    return NextResponse.json({
      business,
      fileName: file.name,
      fileType: file.type || file.name.split('.').pop() || 'unknown',
      strategy: extracted.strategy,
      rows,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to analyze this menu.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
