import { db } from '@/lib/db';
import { customerSchema } from '@/lib/customer-schema';
import { NextResponse } from 'next/server';
import { authErrorResponse, requireAuth } from '@/lib/auth';
import { requirePaidFeature } from '@/lib/guards';
import { writeAuditLog } from '@/lib/audit';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let ctx;
  try { ctx = await requireAuth(request); } catch (error) { const response = authErrorResponse(error); if (response) return response; throw error; }
  const customer = await db.customer.findFirst({ where: { id, businessId: ctx.businessId }, include: { transactions: { where: { isComplete: true, businessId: ctx.businessId }, orderBy: { completedAt: 'desc' } } } });
  return customer ? NextResponse.json(customer) : NextResponse.json({ error: 'Customer not found.' }, { status: 404 });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let ctx;
  try { ctx = await requirePaidFeature(request, 'CUSTOMER_WRITE'); } catch (error) { const response = authErrorResponse(error); if (response) return response; throw error; }
  const parsed = customerSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const value = parsed.data;
  try {
    const customer = await db.customer.findFirst({ where: { id, businessId: ctx.businessId } });
    if (!customer) return NextResponse.json({ error: 'Customer not found.' }, { status: 404 });
    const updated = await db.customer.update({ where: { id }, data: { ...value, email: value.email || null, address: value.address || null, taxId: value.taxId || null, country: value.country || null, notes: value.notes || null } });
    await writeAuditLog(ctx, { action: 'CUSTOMER_UPDATED', entityType: 'Customer', entityId: updated.id, description: `Updated customer ${updated.name}` });
    return NextResponse.json(updated);
  } catch { return NextResponse.json({ error: 'Customer not found.' }, { status: 404 }); }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let ctx;
  try { ctx = await requirePaidFeature(request, 'CUSTOMER_WRITE'); } catch (error) { const response = authErrorResponse(error); if (response) return response; throw error; }
  try {
    const customer = await db.customer.findFirst({ where: { id, businessId: ctx.businessId } });
    if (!customer) return NextResponse.json({ error: 'Customer not found.' }, { status: 404 });
    const updated = await db.customer.update({ where: { id }, data: { isActive: false } });
    await writeAuditLog(ctx, { action: 'CUSTOMER_DEACTIVATED', entityType: 'Customer', entityId: updated.id, description: `Deactivated customer ${updated.name}` });
    return NextResponse.json(updated);
  }
  catch { return NextResponse.json({ error: 'Customer not found.' }, { status: 404 }); }
}
