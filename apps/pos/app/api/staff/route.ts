import { authErrorResponse, requirePermission } from '@/lib/auth';
import { writeAuditLog } from '@/lib/audit';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/src/lib/supabase/server';
import { getServerEnvironment } from '@/lib/env.server';
import { cookies } from 'next/headers';
import { sessionCookieName } from '@/lib/session-cookie';

const staffSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().email(),
  phone: z.string().trim().max(30).optional(),
  role: z.enum(['OWNER', 'MANAGER', 'CASHIER']),
  authUserId: z.string().trim().min(3).optional(),
});

export async function GET(request: Request) {
  try {
    const ctx = await requirePermission(request, 'STAFF_MANAGE');
    const q = new URL(request.url).searchParams.get('q')?.trim();
    const supabase = await createServerClient(request);
    let query = supabase.from('StaffProfile').select('*').eq('businessId', ctx.businessId).order('createdAt', { ascending: false });
    if (q) query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%`);
    const { data: staff, error } = await query;
    if (error) throw error;
    return NextResponse.json(staff);
  } catch (error) {
    const response = authErrorResponse(error);
    if (response) return response;
    return NextResponse.json({ error: 'Unable to load staff.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requirePermission(request, 'STAFF_MANAGE');
    const parsed = staffSchema.safeParse(await request.json());
    if (!parsed.success) {
      const flattened = parsed.error.flatten();
      const fieldMessages = Object.values(flattened.fieldErrors).flat();
      const message = [...flattened.formErrors, ...fieldMessages].filter(Boolean).join(' ');
      return NextResponse.json({ error: message || 'Enter valid staff details.' }, { status: 400 });
    }
    const environment = getServerEnvironment();
    const accessToken = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
      ?? (await cookies()).get(sessionCookieName)?.value;
    if (!accessToken) return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 });
    const response = await fetch(`${environment.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/manage-staff`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        apikey: environment.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ action: 'create', businessId: ctx.businessId, ...parsed.data }),
    });
    if (!response.ok) throw new Error('Staff creation failed');
    const staff = await response.json();
    await writeAuditLog(ctx, { action: 'STAFF_CREATED', entityType: 'StaffProfile', entityId: staff.id, description: `Created staff ${staff.email}` });
    return NextResponse.json(staff, { status: 201 });
  } catch (error) {
    const response = authErrorResponse(error);
    if (response) return response;
    return NextResponse.json({ error: 'Unable to add this staff member. Check that the email is not already in use.' }, { status: 400 });
  }
}
