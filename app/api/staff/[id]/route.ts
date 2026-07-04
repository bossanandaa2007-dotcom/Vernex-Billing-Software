import { db } from '@/lib/db';
import { authErrorResponse, requirePermission } from '@/lib/auth';
import { writeAuditLog } from '@/lib/audit';
import { NextResponse } from 'next/server';
import { z } from 'zod';

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
    const existing = await db.staffProfile.findFirst({ where: { id, businessId: ctx.businessId } });
    if (!existing) return NextResponse.json({ error: 'Staff not found.' }, { status: 404 });
    const staff = await db.staffProfile.update({
      where: { id },
      data: {
        ...parsed.data,
        phone: parsed.data.phone || undefined,
      },
    });
    await writeAuditLog(ctx, { action: staff.status === 'INACTIVE' ? 'STAFF_DEACTIVATED' : 'STAFF_UPDATED', entityType: 'StaffProfile', entityId: staff.id, description: `Updated staff ${staff.email}` });
    return NextResponse.json(staff);
  } catch (error) {
    const response = authErrorResponse(error);
    if (response) return response;
    return NextResponse.json({ error: 'Unable to update staff.' }, { status: 400 });
  }
}
