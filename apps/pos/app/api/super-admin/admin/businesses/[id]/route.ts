import { NextResponse } from 'next/server';
import { z } from 'zod';
import { randomBytes } from 'node:crypto';
import { requireSuperAdmin } from '@/lib/super-admin/auth.server';
import { createPrivilegedSupabase } from '@/lib/super-admin/supabase.server';
import { writeSuperAdminAudit } from '@/services/super-admin/admin-audit.server';

// Optional phone: either blank (clears the field) or exactly 10 digits.
const optionalPhone = z.union([z.literal(''), z.string().trim().regex(/^\d{10}$/, 'Phone must be exactly 10 digits.')]).optional();

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('activate') }),
  z.object({ action: z.literal('suspend') }),
  z.object({ action: z.literal('expire') }),
  z.object({ action: z.literal('extend'), days: z.number().int().min(1).max(365) }),
  z.object({
    action: z.literal('edit'),
    // Business
    name: z.string().trim().min(2).max(120),
    planName: z.string().trim().min(1).max(80).optional(),
    country: z.string().trim().min(2).max(56).optional(),
    currency: z.string().trim().min(1).max(8).optional(),
    // Owner (StaffProfile)
    ownerName: z.string().trim().min(2).max(120).optional(),
    ownerEmail: z.string().trim().email().max(200).optional(),
    ownerPhone: optionalPhone,
    // Shop / receipt (ShopData)
    businessPhone: optionalPhone,
    address: z.string().trim().max(500).optional(),
    taxId: z.string().trim().max(40).optional(),
    // Subscription & trial. trialEndsAt drives the customized trial expiry — the
    // admin can set any end date (or clear it for a non-expiring account).
    subscriptionStatus: z.enum(['ACTIVE', 'TRIAL', 'SUSPENDED', 'EXPIRED']).optional(),
    trialEndsAt: z.union([z.literal(''), z.coerce.date()]).optional(),
  }),
  z.object({ action: z.literal('reset-owner-password') }),
]);

// Build an update object containing only the keys whose value is defined, so
// omitted fields are left untouched rather than overwritten with defaults.
function defined(mapping: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [column, value] of Object.entries(mapping)) {
    if (value !== undefined) out[column] = value;
  }
  return out;
}

// Returns the current editable values so the Edit dialog can pre-fill its form.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  try {
    const supabase = createPrivilegedSupabase();
    const { id } = await params;
    const [{ data: business }, { data: owner }, { data: shop }] = await Promise.all([
      supabase.from('Business').select('name, planName, country, currency, subscriptionStatus, trialEndsAt').eq('id', id).maybeSingle(),
      supabase.from('StaffProfile').select('name, email, phone').eq('businessId', id).eq('role', 'OWNER').order('createdAt', { ascending: true }).limit(1).maybeSingle(),
      supabase.from('ShopData').select('phone, address, taxId').eq('businessId', id).maybeSingle(),
    ]);
    if (!business) return NextResponse.json({ error: 'Business not found.' }, { status: 404 });
    return NextResponse.json({
      name: business.name ?? '',
      planName: business.planName ?? '',
      country: business.country ?? '',
      currency: business.currency ?? '',
      ownerName: owner?.name ?? '',
      ownerEmail: owner?.email ?? '',
      ownerPhone: owner?.phone ?? '',
      businessPhone: shop?.phone ?? '',
      address: shop?.address ?? '',
      taxId: shop?.taxId ?? '',
      subscriptionStatus: business.subscriptionStatus ?? 'TRIAL',
      // Date-only (YYYY-MM-DD) so it drops straight into an <input type="date">.
      trialEndsAt: business.trialEndsAt ? String(business.trialEndsAt).slice(0, 10) : '',
    });
  } catch (error) {
    const message = error instanceof Error && error.message.includes('not configured')
      ? 'Connect the server-only Supabase service-role key to manage businesses.'
      : 'Unable to load this business.';
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Enter a valid action.' }, { status: 400 });
  try {
    // Super Admin manages every tenant, so all reads/writes here use the
    // privileged service-role client; tenant RLS would otherwise scope these to
    // the admin's own business and silently no-op on all others.
    const supabase = createPrivilegedSupabase();
    const { id } = await params;
    if (parsed.data.action === 'reset-owner-password') {
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
      const { error: resetError } = await supabase.auth.admin.updateUserById(owner.authUserId, { password: temporaryPassword });
      if (resetError) throw resetError;
      await writeSuperAdminAudit({ businessId: id, action: 'OWNER_PASSWORD_RESET', entityType: 'StaffProfile', description: 'Reset the owner temporary password.' });
      return NextResponse.json({ success: true, temporaryPassword });
    }
    const now = new Date();
    if (parsed.data.action === 'edit') {
      const { name, planName, country, currency, ownerName, ownerEmail, ownerPhone, businessPhone, address, taxId, subscriptionStatus, trialEndsAt } = parsed.data;
      // Subscription lifecycle: applying a status also sets the derived
      // timestamps so the account state stays internally consistent, matching
      // the standalone Activate/Suspend/Expire actions.
      const lifecycle: Record<string, unknown> = {};
      if (subscriptionStatus !== undefined) {
        lifecycle.subscriptionStatus = subscriptionStatus;
        if (subscriptionStatus === 'ACTIVE') { lifecycle.activatedAt = now.toISOString(); lifecycle.suspendedAt = null; }
        if (subscriptionStatus === 'TRIAL') { lifecycle.suspendedAt = null; }
        if (subscriptionStatus === 'SUSPENDED') { lifecycle.suspendedAt = now.toISOString(); }
        if (subscriptionStatus === 'EXPIRED' && trialEndsAt === undefined) { lifecycle.trialEndsAt = now.toISOString(); }
      }
      // Customized trial expiry: an explicit date overrides everything; an empty
      // string clears it (a non-expiring account).
      if (trialEndsAt !== undefined) {
        lifecycle.trialEndsAt = trialEndsAt === '' ? null : trialEndsAt.toISOString();
      }
      // Business core record.
      const { error: businessError } = await supabase
        .from('Business')
        .update(defined({ name, planName, country, currency, updatedAt: now.toISOString(), ...lifecycle }))
        .eq('id', id);
      if (businessError) throw businessError;
      // Receipt / shop profile. The business name is mirrored onto ShopData so
      // printed receipts and the POS header stay in sync with the rename.
      await supabase
        .from('ShopData')
        .update(defined({ name, phone: businessPhone, address, taxId, country, currency }))
        .eq('businessId', id);
      // Owner account. Only touch it when an owner field was actually provided.
      if (ownerName !== undefined || ownerEmail !== undefined || ownerPhone !== undefined) {
        const { data: owner } = await supabase
          .from('StaffProfile')
          .select('id, authUserId')
          .eq('businessId', id)
          .eq('role', 'OWNER')
          .order('createdAt', { ascending: true })
          .limit(1)
          .maybeSingle();
        if (owner) {
          await supabase
            .from('StaffProfile')
            .update(defined({ name: ownerName, email: ownerEmail, phone: ownerPhone, updatedAt: now.toISOString() }))
            .eq('id', owner.id);
          // Keep the Supabase Auth login email aligned with the profile email so
          // the owner can still sign in. Manual (non-Supabase) accounts are skipped.
          if (ownerEmail !== undefined && owner.authUserId && !String(owner.authUserId).startsWith('manual-')) {
            const { error: authError } = await supabase.auth.admin.updateUserById(owner.authUserId, { email: ownerEmail });
            if (authError) return NextResponse.json({ error: 'Unable to update the owner login email. It may already be in use.' }, { status: 409 });
          }
        }
      }
      await writeSuperAdminAudit({
        businessId: id,
        action: 'BUSINESS_EDIT',
        entityType: 'Business',
        entityId: id,
        description: `Updated business details for ${name}.`,
      });
      return NextResponse.json({ success: true });
    }
    let values: Record<string, unknown> = {};
    if (parsed.data.action === 'activate') values = { subscriptionStatus: 'ACTIVE', planName: 'Activated Plan', activatedAt: now.toISOString(), suspendedAt: null };
    if (parsed.data.action === 'suspend') values = { subscriptionStatus: 'SUSPENDED', suspendedAt: now.toISOString() };
    if (parsed.data.action === 'expire') values = { subscriptionStatus: 'EXPIRED', trialEndsAt: now.toISOString() };
    if (parsed.data.action === 'extend') values = { subscriptionStatus: 'TRIAL', trialEndsAt: new Date(now.getTime() + parsed.data.days * 86_400_000).toISOString(), suspendedAt: null };
    const { error } = await supabase.from('Business').update(values).eq('id', id);
    if (error) throw error;
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
