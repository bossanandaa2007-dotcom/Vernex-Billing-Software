import { db } from '@/lib/db';
import { authErrorResponse, requirePermission } from '@/lib/auth';
import { writeAuditLog } from '@/lib/audit';
import { UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';

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
    const staff = await db.staffProfile.findMany({
      where: {
        businessId: ctx.businessId,
        ...(q ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }] } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
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
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    const value = parsed.data;
    const staff = await db.staffProfile.create({
      data: {
        businessId: ctx.businessId,
        authUserId: value.authUserId || `manual-${value.email.toLowerCase()}`,
        name: value.name,
        email: value.email.toLowerCase(),
        phone: value.phone || null,
        role: value.role as UserRole,
        status: 'ACTIVE',
      },
    });
    await writeAuditLog(ctx, { action: 'STAFF_CREATED', entityType: 'StaffProfile', entityId: staff.id, description: `Created staff ${staff.email}` });
    return NextResponse.json(staff, { status: 201 });
  } catch (error) {
    const response = authErrorResponse(error);
    if (response) return response;
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to create staff.' }, { status: 400 });
  }
}

