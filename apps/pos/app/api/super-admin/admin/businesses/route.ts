import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSuperAdmin } from '@/lib/super-admin/auth.server';
import { createPrivilegedSupabase } from '@/lib/super-admin/supabase.server';
import { DEFAULT_MODULE_KEYS, MODULE_KEYS } from '@/lib/super-admin/modules';

const moduleKeySchema = z.enum(MODULE_KEYS as [typeof MODULE_KEYS[number], ...typeof MODULE_KEYS[number][]]);

const schema = z.object({
  businessName: z.string().trim().min(2),
  ownerName: z.string().trim().min(2),
  email: z.string().trim().email(),
  phone: z.string().trim().regex(/^\d{10}$/, 'Phone must be exactly 10 digits.'),
  taxId: z.string().trim().max(40).optional(),
  address: z.string().trim().min(3).max(500),
  trialDays: z.number().int().min(0).max(365),
  userId: z.string().trim().toLowerCase().min(3).max(50).regex(/^[a-z0-9._-]+$/),
  temporaryPassword: z.string().min(8),
  modules: z.array(moduleKeySchema).optional(),
});

export async function POST(request: Request) {
  const admin = await requireSuperAdmin();
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Complete all required fields with valid information.' }, { status: 400 });
  let authUserId: string | null = null;
  let businessId: string | null = null;
  try {
    const supabase = createPrivilegedSupabase();
    const value = parsed.data;
    const email = value.email.toLowerCase();
    const selectedModuleKeys =
      value.modules && value.modules.length > 0 ? value.modules : DEFAULT_MODULE_KEYS;
    const enabledModuleSet = new Set<string>(selectedModuleKeys);
    const { data: existingUserId, error: lookupError } = await supabase
      .from('StaffProfile')
      .select('id')
      .ilike('userId', value.userId)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (existingUserId) {
      return NextResponse.json({ error: 'This User ID is already in use.' }, { status: 409 });
    }
    const { data: existingEmail, error: emailLookupError } = await supabase
      .from('StaffProfile')
      .select('id')
      .ilike('email', email)
      .maybeSingle();
    if (emailLookupError) throw emailLookupError;
    if (existingEmail) {
      return NextResponse.json({ error: 'This owner email is already attached to a business.' }, { status: 409 });
    }
    const { data: auth, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: value.temporaryPassword,
      email_confirm: true,
      user_metadata: { name: value.ownerName, user_id: value.userId, role: 'OWNER' },
    });
    if (authError || !auth.user) {
      return NextResponse.json({ error: 'Unable to create the owner account. The email may already be registered.' }, { status: 409 });
    }
    authUserId = auth.user.id;
    const trialStartedAt = new Date();
    const nowIso = trialStartedAt.toISOString();
    const trialEndsAt = new Date(trialStartedAt.getTime() + value.trialDays * 86_400_000);
    businessId = crypto.randomUUID();
    try {
      const { error: businessError } = await supabase.from('Business').insert({
        id: businessId,
        name: value.businessName,
        country: 'India',
        currency: 'INR',
        taxMode: 'GST',
        ownerUserId: auth.user.id,
        trialStartedAt: nowIso,
        trialEndsAt: trialEndsAt.toISOString(),
        subscriptionStatus: value.trialDays > 0 ? 'TRIAL' : 'EXPIRED',
        planName: value.trialDays > 0 ? 'Free Trial' : 'No Active Plan',
        updatedAt: nowIso,
      });
      if (businessError) throw businessError;
      const steps = [
        await supabase.from('StaffProfile').insert({
          authUserId: auth.user.id,
          userId: value.userId,
          businessId,
          name: value.ownerName,
          email,
          phone: value.phone,
          role: 'OWNER',
          status: 'ACTIVE',
          updatedAt: nowIso,
        }),
        await supabase.from('ShopData').insert({
          businessId,
          name: value.businessName,
          tax: 0,
          phone: value.phone,
          address: value.address,
          taxId: value.taxId ?? '',
          country: 'India',
          currency: 'INR',
          taxMode: 'GST',
          billPrefix: 'VNX',
          billPadding: 6,
          showBusinessLogo: true,
          showTaxId: true,
          showCustomerDetails: true,
          showItemTax: true,
          showFooter: true,
          receiptSize: '80mm',
        }),
        await supabase.from('BillSequence').insert({ id: businessId, businessId, nextNumber: 1 }),
        await supabase.from('business_modules').upsert(
          MODULE_KEYS.map((moduleKey) => ({
            business_id: businessId,
            module_key: moduleKey,
            enabled: enabledModuleSet.has(moduleKey),
          })),
          { onConflict: 'business_id,module_key' }
        ),
        await supabase.from('AuditLog').insert({
          businessId,
          userId: null,
          userNameSnapshot: 'Vernex Super Admin',
          roleSnapshot: 'OWNER',
          action: 'SUPER_ADMIN_BUSINESS_CREATED',
          entityType: 'Business',
          entityId: businessId,
          description: `Provisioned business ${value.businessName} and owner ${email}.`,
          metadata: {
            superAdminId: admin.id,
            ownerName: value.ownerName,
            ownerEmail: email,
            userId: value.userId,
            trialDays: value.trialDays,
            enabledModules: selectedModuleKeys,
          },
        }),
      ];
      const failed = steps.find((result) => result.error);
      if (failed?.error) throw failed.error;
      await supabase.auth.admin.updateUserById(auth.user.id, {
        user_metadata: {
          name: value.ownerName,
          user_id: value.userId,
          business_id: businessId,
          role: 'OWNER',
        },
      });
      return NextResponse.json({
        id: businessId,
        ownerUserId: auth.user.id,
        userId: value.userId,
      }, { status: 201 });
    } catch (setupError) {
      console.error('[businesses] provisioning failed:', setupError);
      await rollbackProvisioning(supabase, businessId, authUserId);
      return NextResponse.json({ error: 'Unable to finish business setup. No account was retained.' }, { status: 500 });
    }
  } catch (error) {
    const message = error instanceof Error && error.message.includes('not configured')
      ? 'Connect the server-only Supabase service-role key to enable provisioning.'
      : 'Unable to create this business. Please try again.';
    if (businessId || authUserId) {
      try {
        const supabase = createPrivilegedSupabase();
        await rollbackProvisioning(supabase, businessId, authUserId);
      } catch {
        // Best-effort cleanup only; the response below keeps secrets hidden.
      }
    }
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

async function rollbackProvisioning(
  supabase: ReturnType<typeof createPrivilegedSupabase>,
  businessId: string | null,
  authUserId: string | null
) {
  if (businessId) {
    await supabase.from('AuditLog').delete().eq('businessId', businessId);
    await supabase.from('business_modules').delete().eq('business_id', businessId);
    await supabase.from('BillSequence').delete().eq('businessId', businessId);
    await supabase.from('ShopData').delete().eq('businessId', businessId);
    await supabase.from('StaffProfile').delete().eq('businessId', businessId);
    await supabase.from('Business').delete().eq('id', businessId);
  } else if (authUserId) {
    await supabase.from('StaffProfile').delete().eq('authUserId', authUserId);
  }
  if (authUserId) {
    await supabase.auth.admin.deleteUser(authUserId);
  }
}
