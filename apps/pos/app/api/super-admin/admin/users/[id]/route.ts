import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSuperAdmin } from '@/lib/super-admin/auth.server';
import { createPrivilegedSupabase } from '@/lib/super-admin/supabase.server';
import { writeSuperAdminAudit } from '@/services/super-admin/admin-audit.server';

const schema = z.object({ action: z.enum(['reset-password', 'disable', 'enable']) });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Enter a valid user action.' }, { status: 400 });
  try {
    const supabase = createPrivilegedSupabase();
    const { id } = await params;
    const { data: staff, error } = await supabase.from('StaffProfile').select('authUserId,businessId').eq('id', id).single();
    if (error || !staff) return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    if (parsed.data.action === 'reset-password') {
      if (!staff.authUserId || String(staff.authUserId).startsWith('manual-')) {
        return NextResponse.json({ error: 'This user does not have a linked login account.' }, { status: 409 });
      }
      const temporaryPassword = `${randomBytes(9).toString('base64url')}A1!`;
      const { error: resetError } = await supabase.auth.admin.updateUserById(staff.authUserId, { password: temporaryPassword });
      if (resetError) throw resetError;
      await writeSuperAdminAudit({ businessId: staff.businessId, action: 'USER_PASSWORD_RESET', entityType: 'StaffProfile', entityId: id, description: 'Reset a user temporary password.' });
      return NextResponse.json({ success: true, temporaryPassword });
    }
    const status = parsed.data.action === 'enable' ? 'ACTIVE' : 'INACTIVE';
    const { error: updateError } = await supabase.from('StaffProfile').update({ status }).eq('id', id);
    if (updateError) throw updateError;
    await writeSuperAdminAudit({ businessId: staff.businessId, action: `USER_${status}`, entityType: 'StaffProfile', entityId: id, description: `${status === 'ACTIVE' ? 'Enabled' : 'Disabled'} a user account.` });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error && error.message.includes('not configured')
      ? 'Connect the server-only Supabase service-role key to manage users.'
      : 'Unable to update this user.';
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  try {
    const supabase = createPrivilegedSupabase();
    const { id } = await params;
    const { data: staff, error } = await supabase.from('StaffProfile').select('authUserId,role,businessId').eq('id', id).single();
    if (error || !staff) return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    if (staff.role === 'OWNER') return NextResponse.json({ error: 'Delete the business instead of deleting its owner.' }, { status: 409 });
    await supabase.from('StaffProfile').delete().eq('id', id);
    if (staff.authUserId && !String(staff.authUserId).startsWith('manual-')) {
      await supabase.auth.admin.deleteUser(staff.authUserId);
    }
    await writeSuperAdminAudit({ businessId: staff.businessId, action: 'USER_DELETED', entityType: 'StaffProfile', entityId: id, description: 'Deleted a staff user account.' });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error && error.message.includes('not configured')
      ? 'Connect the server-only Supabase service-role key to delete users.'
      : 'Unable to delete this user.';
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
