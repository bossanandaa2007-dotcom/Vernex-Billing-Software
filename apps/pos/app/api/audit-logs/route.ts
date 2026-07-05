import { db } from '@/lib/db';
import { authErrorResponse, requirePermission } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const ctx = await requirePermission(request, 'AUDIT_VIEW');
    const logs = await db.auditLog.findMany({
      where: { businessId: ctx.businessId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return NextResponse.json(logs);
  } catch (error) {
    const response = authErrorResponse(error);
    if (response) return response;
    return NextResponse.json({ error: 'Unable to load audit logs.' }, { status: 500 });
  }
}

