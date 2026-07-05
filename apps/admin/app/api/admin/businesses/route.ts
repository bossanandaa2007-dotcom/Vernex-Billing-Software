import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSuperAdmin } from '@/lib/auth.server';
import { createPrivilegedSupabase } from '@/lib/supabase.server';
import { writeSuperAdminAudit } from '@/services/admin-audit.server';

const schema = z.object({
  businessName: z.string().trim().min(2),
  ownerName: z.string().trim().min(2),
  email: z.string().trim().email(),
  phone: z.string().trim().min(3),
  taxId: z.string().trim().max(40).optional(),
  address: z.string().trim().max(500).optional(),
  trialDays: z.number().int().min(0).max(365),
  username: z.string().trim().min(3).max(50),
  temporaryPassword: z.string().min(8),
});

export async function POST(request: Request) {
  await requireSuperAdmin();
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Complete all required fields with valid information.' }, { status: 400 });
  try {
    const supabase = createPrivilegedSupabase();
    const value = parsed.data;
    const { data: auth, error: authError } = await supabase.auth.admin.createUser({
      email: value.email,
      password: value.temporaryPassword,
      email_confirm: true,
      user_metadata: { name: value.ownerName, username: value.username },
    });
    if (authError || !auth.user) {
      return NextResponse.json({ error: 'Unable to create the owner account. The email may already be registered.' }, { status: 409 });
    }
    const trialStartedAt = new Date();
    const trialEndsAt = new Date(trialStartedAt.getTime() + value.trialDays * 86_400_000);
    const businessId = crypto.randomUUID();
    try {
      const { error: businessError } = await supabase.from('Business').insert({
        id: businessId,
        name: value.businessName,
        country: 'India',
        currency: 'INR',
        taxMode: 'GST',
        ownerUserId: auth.user.id,
        trialStartedAt: trialStartedAt.toISOString(),
        trialEndsAt: trialEndsAt.toISOString(),
        subscriptionStatus: value.trialDays > 0 ? 'TRIAL' : 'EXPIRED',
        planName: value.trialDays > 0 ? 'Free Trial' : 'No Active Plan',
      });
      if (businessError) throw businessError;
      const inserts = await Promise.all([
        supabase.from('StaffProfile').insert({
          authUserId: auth.user.id,
          businessId,
          name: value.ownerName,
          email: value.email.toLowerCase(),
          phone: value.phone,
          role: 'OWNER',
          status: 'ACTIVE',
        }),
        supabase.from('ShopData').insert({
          businessId,
          name: value.businessName,
          phone: value.phone,
          address: value.address || null,
          taxId: value.taxId || null,
          country: 'India',
          currency: 'INR',
          taxMode: 'GST',
        }),
        supabase.from('BillSequence').insert({ id: businessId, businessId, nextNumber: 1 }),
      ]);
      if (inserts.some((result) => result.error)) throw new Error('Related business setup failed.');
      await writeSuperAdminAudit({
        businessId,
        action: 'BUSINESS_CREATED',
        entityType: 'Business',
        entityId: businessId,
        description: `Created business ${value.businessName} and owner ${value.email}.`,
      });
      return NextResponse.json({ id: businessId }, { status: 201 });
    } catch {
      await supabase.from('Business').delete().eq('id', businessId);
      await supabase.auth.admin.deleteUser(auth.user.id);
      return NextResponse.json({ error: 'Unable to finish business setup. No account was retained.' }, { status: 500 });
    }
  } catch (error) {
    const message = error instanceof Error && error.message.includes('not configured')
      ? 'Connect the server-only Supabase service-role key to enable provisioning.'
      : 'Unable to create this business. Please try again.';
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
