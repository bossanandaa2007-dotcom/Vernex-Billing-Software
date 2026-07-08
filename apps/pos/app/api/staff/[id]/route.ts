import { authErrorResponse, requirePermission } from '@/lib/auth';
import { writeAuditLog } from '@/lib/audit';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/src/lib/supabase/server';

const schema = z.object({
  name: z.string().trim().min(2).optional(),
  phone: z.string().trim().max(30).optional(),
  role: z.enum(['OWNER', 'MANAGER', 'CASHIER']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const ctx = await requirePermission(request, 'STAFF_MANAGE');
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    const supabase = await createServerClient(request);
    const { data: existing } = await supabase.from('StaffProfile').select('*').eq('id', id).eq('businessId', ctx.businessId).maybeSingle();
    if (!existing) return NextResponse.json({ error: 'Staff not found.' }, { status: 404 });
    const { data: staff, error } = await supabase.from('StaffProfile').update({
        ...parsed.data,
        phone: parsed.data.phone || undefined,
      }).eq('id', id).select('*').single();
    if (error) throw error;
    await writeAuditLog(ctx, { action: staff.status === 'INACTIVE' ? 'STAFF_DEACTIVATED' : 'STAFF_UPDATED', entityType: 'StaffProfile', entityId: staff.id, description: `Updated staff ${staff.email}` });
    return NextResponse.json(staff);
  } catch (error) {
    const response = authErrorResponse(error);
    if (response) return response;
    return NextResponse.json({ error: 'Unable to update staff.' }, { status: 400 });
  }
}
