import { NextResponse } from 'next/server';
import { z } from 'zod';
import { randomBytes } from 'node:crypto';
import { createAuthenticatedAdminClient, requireSuperAdmin } from '@/lib/auth.server';
import { createPrivilegedSupabase } from '@/lib/supabase.server';
import { writeSuperAdminAudit } from '@/services/admin-audit.server';

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('activate') }),
  z.object({ action: z.literal('suspend') }),
  z.object({ action: z.literal('expire') }),
  z.object({ action: z.literal('extend'), days: z.number().int().min(1).max(365) }),
  z.object({ action: z.literal('edit'), name: z.string().trim().min(2) }),
  z.object({ action: z.literal('reset-owner-password') }),
]);

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Enter a valid action.' }, { status: 400 });
  try {
    const supabase = await createAuthenticatedAdminClient();
    const { id } = await params;
    if (parsed.data.action === 'reset-owner-password') {
      const privileged = createPrivilegedSupabase();
      const { data: owner, error: ownerError } = await supabase
        .from('StaffProfile')
        .select('authUserId')
        .eq('businessId', id)
        .eq('role', 'OWNER')
        .order('createdAt', { ascending: true })
        .limit(1)
        .single();
      if (ownerError || !owner?.authUserId || String(owner.authUserId).startsWith('manual-')) {
        return NextResponse.json({ error: 'This owner does not have a linked login account.' }, { status: 409 });
      }
      const temporaryPassword = `${randomBytes(9).toString('base64url')}A1!`;
      const { error: resetError } = await privileged.auth.admin.updateUserById(owner.authUserId, { password: temporaryPassword });
      if (resetError) throw resetError;
      await writeSuperAdminAudit({ businessId: id, action: 'OWNER_PASSWORD_RESET', entityType: 'StaffProfile', description: 'Reset the owner temporary password.' });
      return NextResponse.json({ success: true, temporaryPassword });
    }
    const now = new Date();
    let values: Record<string, unknown> = {};
    if (parsed.data.action === 'activate') values = { subscriptionStatus: 'ACTIVE', planName: 'Activated Plan', activatedAt: now.toISOString(), suspendedAt: null };
    if (parsed.data.action === 'suspend') values = { subscriptionStatus: 'SUSPENDED', suspendedAt: now.toISOString() };
    if (parsed.data.action === 'expire') values = { subscriptionStatus: 'EXPIRED', trialEndsAt: now.toISOString() };
    if (parsed.data.action === 'extend') values = { subscriptionStatus: 'TRIAL', trialEndsAt: new Date(now.getTime() + parsed.data.days * 86_400_000).toISOString(), suspendedAt: null };
    if (parsed.data.action === 'edit') values = { name: parsed.data.name };
    const { error } = await supabase.from('Business').update(values).eq('id', id);
    if (error) throw error;
    if (parsed.data.action === 'edit') await supabase.from('ShopData').update({ name: parsed.data.name }).eq('businessId', id);
    await writeSuperAdminAudit({
      businessId: id,
      action: `BUSINESS_${parsed.data.action.toUpperCase()}`,
      entityType: 'Business',
      entityId: id,
      description: `Applied ${parsed.data.action.replaceAll('-', ' ')} to the business.`,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error && error.message.includes('not configured')
      ? 'Connect the server-only Supabase service-role key to manage businesses.'
      : 'Unable to update this business.';
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  try {
    const supabase = createPrivilegedSupabase();
    const { id } = await params;
    const { data: transactions } = await supabase.from('Transaction').select('id').eq('businessId', id);
    const transactionIds = (transactions ?? []).map((item) => item.id);
    const { data: returns } = await supabase.from('SaleReturn').select('id').eq('businessId', id);
    const returnIds = (returns ?? []).map((item) => item.id);
    const { data: staff } = await supabase.from('StaffProfile').select('authUserId').eq('businessId', id);
    if (returnIds.length) await supabase.from('ReturnItem').delete().in('saleReturnId', returnIds);
    await supabase.from('SaleReturn').delete().eq('businessId', id);
    if (transactionIds.length) await supabase.from('OnSaleProduct').delete().in('transactionId', transactionIds);
    await supabase.from('Transaction').delete().eq('businessId', id);
    await supabase.from('InventoryMovement').delete().eq('businessId', id);
    await supabase.from('Customer').delete().eq('businessId', id);
    await supabase.from('ProductStock').delete().eq('businessId', id);
    await supabase.from('ShopData').delete().eq('businessId', id);
    await supabase.from('AuditLog').delete().eq('businessId', id);
    await supabase.from('BillSequence').delete().eq('businessId', id);
    await supabase.from('StaffProfile').delete().eq('businessId', id);
    const { error } = await supabase.from('Business').delete().eq('id', id);
    if (error) throw error;
    for (const member of staff ?? []) {
      if (member.authUserId && !String(member.authUserId).startsWith('manual-')) {
        await supabase.auth.admin.deleteUser(member.authUserId);
      }
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error && error.message.includes('not configured')
      ? 'Connect the server-only Supabase service-role key to delete businesses.'
      : 'Unable to delete this business. Verify dependent records and try again.';
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
