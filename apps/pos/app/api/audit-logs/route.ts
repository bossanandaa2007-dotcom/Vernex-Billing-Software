import { authErrorResponse, requirePermission } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { createServerClient } from '@/src/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const ctx = await requirePermission(request, 'AUDIT_VIEW');
    const supabase = await createServerClient(request);
    const { data: logs, error } = await supabase.from('AuditLog').select('*')
      .eq('businessId', ctx.businessId).order('createdAt', { ascending: false }).limit(200);
    if (error) throw error;
    return NextResponse.json(logs);
  } catch (error) {
    const response = authErrorResponse(error);
    if (response) return response;
    return NextResponse.json({ error: 'Unable to load audit logs.' }, { status: 500 });
  }
}
